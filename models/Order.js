const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customer: { type: String, required: true },
    date: { type: String }, // Storing as string to match existing frontend date format
    amount: { type: Number, required: true },
    status: { type: String, default: 'Processing' },
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
