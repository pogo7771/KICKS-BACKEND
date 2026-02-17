require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const sequelize = require('./config/database');

// Import Sequelize Models
const Product = require('./models/Product');
const Order = require('./models/Order');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Settings = require('./models/Settings');
const SecurityLog = require('./models/SecurityLog');
const Coupon = require('./models/Coupon');

const app = express();

// Middleware
app.use(cors({
    origin: '*', // Allow all origins (or specify your Netlify URL)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));
app.use(express.json({ limit: '5mb' }));
app.use(helmet({
    crossOriginResourcePolicy: false, // Allow loading resources from other domains
}));

// Request logger
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} [${res.statusCode}] - ${duration}ms`);
    });
    next();
});

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000, // Increased for dev environment
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many requests, please try again after 15 minutes' }
});
app.use('/api/', limiter);

// Password Validator
const isValidPassword = (password) => {
    // Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(password);
};

// Database Connection & Sync
sequelize.authenticate()
    .then(() => {
        console.log('Connected to SQL Database (SQLite)');
        // Sync models (create tables if they don't exist)
        // force: false ensures we don't drop existing tables on restart
        return sequelize.sync({ force: false });
    })
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Could not connect to Database:', err));

// Routes - Auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({ name, email, password });
        // Password hashing is handled by "beforeSave" hook in model

        const token = jwt.sign({ id: user.id, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: false } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, isAdmin: false } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/auth/profile/:id', async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email;
        await user.save();

        res.json({ id: user.id, name: user.name, email: user.email, isAdmin: false });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/auth/password/:id', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.params.id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(400).json({ message: 'Incorrect current password' });

        user.password = newPassword; // Hook hashes it
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin Auth Routes
app.post('/api/auth/admin/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingAdmin = await Admin.findOne({ where: { email } });
        if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });

        const admin = await Admin.create({ name, email, password });

        const token = jwt.sign({ id: admin.id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: admin.id, name: admin.name, email: admin.email, isAdmin: true } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ where: { email } });

        if (!admin) {
            await SecurityLog.create({
                event: 'LOGIN_FAILURE',
                userEmail: email,
                details: 'Non-existent admin email',
                severity: 'MEDIUM',
                status: 'FAILURE'
            });
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check if account is locked
        if (admin.lockedUntil && new Date(admin.lockedUntil) > new Date()) {
            const minutesLeft = Math.ceil((new Date(admin.lockedUntil) - Date.now()) / 60000);
            await SecurityLog.create({
                event: 'LOGIN_BLOCKED',
                userEmail: email,
                details: `Locked for ${minutesLeft} more minutes`,
                severity: 'HIGH',
                status: 'FAILURE'
            });
            return res.status(403).json({ message: `Account locked. Please try again in ${minutesLeft} minutes.` });
        }

        const isMatch = await admin.comparePassword(password);

        if (!isMatch) {
            admin.failedLoginAttempts += 1;
            let message = 'Invalid credentials';

            if (admin.failedLoginAttempts >= 5) {
                admin.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lock
                admin.failedLoginAttempts = 0;
                message = 'Too many failed attempts. Account locked for 30 minutes.';
                await SecurityLog.create({
                    event: 'ACCOUNT_LOCKOUT',
                    userEmail: email,
                    severity: 'CRITICAL',
                    status: 'FAILURE'
                });
            } else {
                await SecurityLog.create({
                    event: 'LOGIN_FAILURE',
                    userEmail: email,
                    details: `Failed attempt ${admin.failedLoginAttempts}`,
                    severity: 'LOW',
                    status: 'FAILURE'
                });
            }

            await admin.save();
            return res.status(400).json({ message });
        }

        // Reset failed attempts on successful login
        admin.failedLoginAttempts = 0;
        admin.lockedUntil = null;
        await admin.save();

        // Check for 2FA
        if (admin.twoFactorEnabled) {
            await SecurityLog.create({
                event: '2FA_REQUIRED',
                userEmail: email,
                details: 'Waiting for 2FA verification',
                severity: 'LOW',
                status: 'SUCCESS'
            });
            return res.json({
                requires2FA: true,
                tempId: admin.id,
                message: '2FA verification code sent to your registered device (Simulated)'
            });
        }

        await SecurityLog.create({
            event: 'LOGIN_SUCCESS',
            userEmail: email,
            severity: 'LOW',
            status: 'SUCCESS'
        });

        const token = jwt.sign({ id: admin.id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                isAdmin: true,
                bio: admin.bio,
                avatar: admin.avatar,
                twoFactorEnabled: admin.twoFactorEnabled
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Verification route for 2FA (Simulated)
app.post('/api/auth/admin/verify-2fa', async (req, res) => {
    try {
        const { id, code } = req.body;
        const admin = await Admin.findByPk(id);

        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        if (code !== '123456') {
            await SecurityLog.create({
                event: '2FA_FAILURE',
                userEmail: admin.email,
                details: 'Invalid 2FA code entered',
                severity: 'MEDIUM',
                status: 'FAILURE'
            });
            return res.status(400).json({ message: 'Invalid 2FA code' });
        }

        await SecurityLog.create({
            event: 'LOGIN_SUCCESS',
            userEmail: admin.email,
            details: 'Verified via 2FA',
            severity: 'LOW',
            status: 'SUCCESS'
        });

        const token = jwt.sign({ id: admin.id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                isAdmin: true,
                bio: admin.bio,
                avatar: admin.avatar,
                twoFactorEnabled: admin.twoFactorEnabled
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Forgot Password Route
app.post('/api/auth/admin/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const admin = await Admin.findOne({ where: { email } });

        if (!admin) {
            return res.json({ message: 'If an account exists, a reset link has been sent.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

        admin.resetPasswordToken = resetPasswordToken;
        admin.resetPasswordExpires = resetPasswordExpires;
        await admin.save();

        console.log(`Reset Token for ${email}: ${resetToken}`);

        await SecurityLog.create({
            event: 'PASSWORD_RESET_REQUEST',
            userEmail: email,
            details: 'Password reset link requested',
            severity: 'LOW',
            status: 'SUCCESS'
        });

        res.json({
            message: 'Reset link sent (Check server console for token)',
            devToken: resetToken
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Reset Password Route
app.post('/api/auth/admin/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
        const { Op } = require('sequelize');

        const admin = await Admin.findOne({
            where: {
                resetPasswordToken,
                resetPasswordExpires: { [Op.gt]: new Date() }
            }
        });

        if (!admin) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        admin.password = newPassword;
        admin.resetPasswordToken = null;
        admin.resetPasswordExpires = null;
        admin.lockedUntil = null;
        admin.failedLoginAttempts = 0;

        await admin.save();

        await SecurityLog.create({
            event: 'PASSWORD_RESET_SUCCESS',
            userEmail: admin.email,
            details: 'Password reset completed via token',
            severity: 'MEDIUM',
            status: 'SUCCESS'
        });

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Update Admin Profile
app.put('/api/auth/admin/profile/:id', async (req, res) => {
    try {
        const { name, bio, avatar, twoFactorEnabled } = req.body;
        const admin = await Admin.findByPk(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        if (name) admin.name = name;
        if (bio !== undefined) admin.bio = bio;
        if (avatar !== undefined) admin.avatar = avatar;
        if (twoFactorEnabled !== undefined) admin.twoFactorEnabled = twoFactorEnabled;

        await admin.save();
        res.json({
            id: admin.id,
            name: admin.name,
            email: admin.email,
            isAdmin: true,
            bio: admin.bio,
            avatar: admin.avatar,
            twoFactorEnabled: admin.twoFactorEnabled
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update Admin Password
app.put('/api/auth/admin/password/:id', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const admin = await Admin.findByPk(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and include uppercase, lowercase, numbers, and special characters.'
            });
        }

        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) return res.status(400).json({ message: 'Current password incorrect' });

        admin.password = newPassword;
        await admin.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Product Routes
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const newProduct = await Product.create(req.body);

        await SecurityLog.create({
            event: 'PRODUCT_CREATE',
            userEmail: 'admin@kicks.com',
            details: `Added new product: ${newProduct.name}`,
            severity: 'LOW',
            status: 'SUCCESS'
        });

        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.put('/api/products/:id', async (req, res) => {
    try {
        // Sequelize update returns [count, [rows]] only for postgres with returning: true
        // For other dialects, we need to find then update or update then find
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        await product.update(req.body);

        await SecurityLog.create({
            event: 'PRODUCT_UPDATE',
            userEmail: 'admin@kicks.com',
            details: `Updated product: ${product.name}`,
            severity: 'LOW',
            status: 'SUCCESS'
        });

        res.json(product);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const name = product.name;
        await product.destroy();

        await SecurityLog.create({
            event: 'PRODUCT_DELETE',
            userEmail: 'admin@kicks.com',
            details: `Deleted product: ${name}`,
            severity: 'MEDIUM',
            status: 'SUCCESS'
        });

        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/products/:id/reviews', async (req, res) => {
    try {
        const { rating, comment, user } = req.body;
        const product = await Product.findByPk(req.params.id);

        if (product) {
            // Note: product.reviews is a JSON array
            const currentReviews = product.reviews || [];

            const alreadyReviewed = currentReviews.find(
                (r) => r.user === user
            );

            if (alreadyReviewed) {
                return res.status(400).json({ message: 'Product already reviewed' });
            }

            const reviewId = Date.now().toString();
            const review = {
                id: reviewId,
                _id: reviewId,
                user,
                rating: Number(rating),
                comment,
                date: new Date()
            };

            const updatedReviews = [...currentReviews, review];

            const numReviews = updatedReviews.length;
            const avgRating = updatedReviews.reduce((acc, item) => item.rating + acc, 0) / numReviews;

            await product.update({
                reviews: updatedReviews,
                numReviews: numReviews,
                rating: avgRating
            });

            res.status(201).json({ message: 'Review added' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/products/:id/reviews/:reviewId', async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (product) {
            const currentReviews = product.reviews || [];
            // Assuming reviewId is passed as string, and we store it as id in review object
            // Note: The previous mongo one used _id, here we simulated id in the previous route.
            // If existing validation relies on _id, this might be tricky if not migrated.
            // Since we are starting fresh with SQL, new reviews have 'id'.

            // Filter by id or _id to be safe
            const updatedReviews = currentReviews.filter(r => r.id !== req.params.reviewId && r._id !== req.params.reviewId);

            if (currentReviews.length === updatedReviews.length) {
                return res.status(404).json({ message: 'Review not found' });
            }

            const numReviews = updatedReviews.length;
            const avgRating = numReviews > 0
                ? updatedReviews.reduce((acc, item) => item.rating + acc, 0) / numReviews
                : 0;

            await product.update({
                reviews: updatedReviews,
                numReviews: numReviews,
                rating: avgRating
            });

            res.json({ message: 'Review removed' });
        } else {
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Routes - Orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.findAll({ order: [['createdAt', 'DESC']] });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/orders', async (req, res) => {
    const orderData = { ...req.body };
    if (!orderData.date) {
        orderData.date = new Date().toISOString().split('T')[0];
    }

    try {
        const newOrder = await Order.create(orderData);

        // Automatically decrease stock for each item in the order
        if (orderData.items && Array.isArray(orderData.items)) {
            for (const item of orderData.items) {
                const productId = item.id || item._id;
                if (productId) {
                    const product = await Product.findByPk(productId);
                    if (product) {
                        await product.decrement('stock', { by: item.quantity || 1 });
                    }
                }
            }
        }

        res.status(201).json(newOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.patch('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        await order.update({ status: req.body.status });
        res.json(order);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Routes - Users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.findAll({
            order: [['createdAt', 'DESC']],
            attributes: { exclude: ['password'] }
        });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Routes - Settings
app.get('/api/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/settings', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (settings) {
            await settings.update({ ...req.body, lastUpdated: new Date() });
        } else {
            settings = await Settings.create(req.body);
        }

        await SecurityLog.create({
            event: 'SETTINGS_UPDATE',
            userEmail: 'admin@system.local',
            details: 'System settings modified',
            severity: 'MEDIUM',
            status: 'SUCCESS'
        });

        res.json(settings);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Route - Security Logs
app.get('/api/security/logs', async (req, res) => {
    try {
        const logs = await SecurityLog.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route - Payment (Stripe)
app.post('/api/create-payment-intent', async (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
        return res.status(503).json({
            message: "Payment system unavailable (Server Config Error). Please try Cash on Delivery."
        });
    }

    try {
        const stripe = require('stripe')(stripeKey);
        const { amount, currency = 'inr' } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (e) {
        console.error("Stripe Error:", e.message);
        res.status(400).send({ error: { message: e.message } });
    }
});

// Routes - Coupons
app.get('/api/coupons', async (req, res) => {
    try {
        const coupons = await Coupon.findAll({ order: [['createdAt', 'DESC']] });
        res.json(coupons);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/coupons', async (req, res) => {
    try {
        const newCoupon = await Coupon.create(req.body);
        await SecurityLog.create({
            event: 'COUPON_CREATE',
            userEmail: 'admin@system.local',
            details: `Created coupon: ${newCoupon.code}`,
            severity: 'LOW',
            status: 'SUCCESS'
        });
        res.status(201).json(newCoupon);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/coupons/:id', async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ message: 'Coupon not found' });

        const code = coupon.code;
        await coupon.destroy();

        await SecurityLog.create({
            event: 'COUPON_DELETE',
            userEmail: 'admin@system.local',
            details: `Deleted coupon: ${code}`,
            severity: 'MEDIUM',
            status: 'SUCCESS'
        });
        res.json({ message: 'Coupon deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/coupons/validate', async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        const coupon = await Coupon.findOne({ where: { code, isActive: true } });

        if (!coupon) return res.status(404).json({ message: 'Invalid coupon code' });

        if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
            return res.status(400).json({ message: 'Coupon has expired' });
        }

        if (cartTotal < coupon.minPurchase) {
            return res.status(400).json({ message: `Minimum purchase of ${coupon.minPurchase} required` });
        }

        let discount = 0;
        if (coupon.discountType === 'percentage') { // Adjusted field name from mongo
            discount = (cartTotal * coupon.value) / 100;
        } else {
            discount = coupon.value;
        }

        res.json({
            success: true,
            discount: Math.min(discount, cartTotal),
            coupon: coupon
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
