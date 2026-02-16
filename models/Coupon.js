const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    type: { type: String, enum: ['percentage', 'fixed'], required: true },
    value: { type: Number, required: true },
    minPurchase: { type: Number, default: 0 },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
