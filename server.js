require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const Product = require('./models/Product');
const Order = require('./models/Order');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Settings = require('./models/Settings');
const SecurityLog = require('./models/SecurityLog');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // Allow specific frontend or all
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(helmet());

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

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB', err));

// Routes - Auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const user = new User({ name, email, password });
        await user.save();

        const token = jwt.sign({ id: user._id, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: false } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id, isAdmin: false }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: false } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Admin Auth Routes
app.post('/api/auth/admin/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) return res.status(400).json({ message: 'Admin already exists' });

        const admin = new Admin({ name, email, password });
        await admin.save();

        const token = jwt.sign({ id: admin._id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: admin._id, name: admin.name, email: admin.email, isAdmin: true } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/auth/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

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
        if (admin.lockedUntil && admin.lockedUntil > Date.now()) {
            const minutesLeft = Math.ceil((admin.lockedUntil - Date.now()) / 60000);
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
                admin.lockedUntil = Date.now() + 30 * 60 * 1000; // 30 minutes lock
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
                tempId: admin._id,
                message: '2FA verification code sent to your registered device (Simulated)'
            });
        }

        await SecurityLog.create({
            event: 'LOGIN_SUCCESS',
            userEmail: email,
            severity: 'LOW',
            status: 'SUCCESS'
        });

        const token = jwt.sign({ id: admin._id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: admin._id,
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
        const admin = await Admin.findById(id);

        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        // In a real app, verify 'code' with a 2FA library (e.g., speakeasy)
        // For simulation, we'll accept '123456'
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

        const token = jwt.sign({ id: admin._id, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: admin._id,
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
        const admin = await Admin.findOne({ email });

        if (!admin) {
            // Should not reveal if user exists or not
            return res.json({ message: 'If an account exists, a reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes

        admin.resetPasswordToken = resetPasswordToken;
        admin.resetPasswordExpires = resetPasswordExpires;
        await admin.save();

        // In production, send email here
        // For dev, log it and return it for easy testing
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
            devToken: resetToken // REMOVE IN PRODUCTION
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

        const admin = await Admin.findOne({
            resetPasswordToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!admin) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        admin.password = newPassword;
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpires = undefined;
        admin.lockedUntil = null; // Unlocks account if locked
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
        const admin = await Admin.findById(req.params.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        if (name) admin.name = name;
        if (bio !== undefined) admin.bio = bio;
        if (avatar !== undefined) admin.avatar = avatar;
        if (twoFactorEnabled !== undefined) admin.twoFactorEnabled = twoFactorEnabled;

        await admin.save();
        res.json({
            id: admin._id,
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
        const admin = await Admin.findById(req.params.id);
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
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const product = new Product(req.body);
    try {
        const newProduct = await product.save();

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
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });

        await SecurityLog.create({
            event: 'PRODUCT_UPDATE',
            userEmail: 'admin@kicks.com',
            details: `Updated product: ${updatedProduct.name}`,
            severity: 'LOW',
            status: 'SUCCESS'
        });

        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);

        await SecurityLog.create({
            event: 'PRODUCT_DELETE',
            userEmail: 'admin@kicks.com',
            details: `Deleted product: ${deletedProduct?.name || req.params.id}`,
            severity: 'MEDIUM',
            status: 'SUCCESS'
        });

        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Routes - Orders
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
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
    const order = new Order(orderData);
    try {
        const newOrder = await order.save();

        // Automatically decrease stock for each item in the order
        if (orderData.items && Array.isArray(orderData.items)) {
            for (const item of orderData.items) {
                // Find product by id (could be item.id or item._id)
                const productId = item.id || item._id;
                if (productId) {
                    await Product.findByIdAndUpdate(productId, {
                        $inc: { stock: -(item.quantity || 1) }
                    });
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
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status: req.body.status },
            { new: true }
        );
        res.json(updatedOrder);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Routes - Users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password').sort({ createdAt: -1 });
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
            settings = new Settings();
            await settings.save();
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
            Object.assign(settings, req.body);
            settings.lastUpdated = Date.now();
            await settings.save();
        } else {
            settings = new Settings(req.body);
            await settings.save();
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
        const logs = await SecurityLog.find().sort({ createdAt: -1 }).limit(100);
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

        // Create a PaymentIntent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to smallest currency unit (paise/cents)
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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
