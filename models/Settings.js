const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
    storeName: { type: String, default: 'KICKS. Premium Footwear' },
    storeEmail: { type: String, default: 'admin@kicks-store.com' },
    currency: { type: String, default: 'INR (₹) - Indian Rupee' },
    timezone: { type: String, default: '(GMT+05:30) IST - Kolkata' },
    notifications: {
        sales: { type: Boolean, default: true },
        reports: { type: Boolean, default: true },
        stock: { type: Boolean, default: false },
        signups: { type: Boolean, default: false }
    },
    sessionTimeout: { type: Number, default: 15 }, // in minutes
    security: {
        twoFactorEnabled: { type: Boolean, default: false },
        failedLoginAttempts: { type: Number, default: 0 },
        lockedUntil: { type: Date, default: null }
    },
    
    // Adding versioning/last updated for audit trail
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
