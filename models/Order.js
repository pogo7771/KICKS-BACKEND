const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customer: { type: String, required: true },
    email: { type: String }, // For guest checkout or linking by email
    userId: { type: String }, // Robust linking for logged-in users
    date: { type: String }, // Storing as string to match existing frontend date format
    amount: { type: Number, required: true },
    status: { type: String, default: 'Processing' },
    paymentMethod: { type: String, default: 'COD' },
    discount: { type: Number, default: 0 },
    coupon: { type: String, default: null },
    items: [{
        id: { type: String },
        name: { type: String },
        price: { type: Number },
        quantity: { type: Number },
        size: { type: String }
    }]
}, { timestamps: true });

// Virtual for id
orderSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

orderSchema.set('toJSON', {
    virtuals: true
});

module.exports = mongoose.model('Order', orderSchema);
