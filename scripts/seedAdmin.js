
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
require('dotenv').config();

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const existingAdmin = await Admin.findOne({ email: 'admin@store.com' });

        if (existingAdmin) {
            console.log('Admin already exists.');
            // Reset password just in case
            existingAdmin.password = 'Admin@123';
            existingAdmin.lockedUntil = null;
            existingAdmin.failedLoginAttempts = 0;
            // The pre-save hook will detect change and hash it
            await existingAdmin.save();
            console.log('Admin password reset to: Admin@123');
        } else {
            const newAdmin = new Admin({
                name: 'System Admin',
                email: 'admin@store.com',
                password: 'Admin@123',
                role: 'superadmin',
                bio: 'System Administrator',
                avatar: ''
            });
            await newAdmin.save();
            console.log('Admin created with email: admin@store.com and password: Admin@123');
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
