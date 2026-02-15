const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String },
    price: { type: Number, required: true },
    rating: { type: Number, default: 0 },
    category: { type: String, required: true },
    gender: { type: String },
    images: {
        primary: { type: String, required: true },
        secondary: { type: String }
    },
    description: { type: String },
    stock: { type: Number, default: 24 },
    inStock: { type: Boolean, default: true }
}, { timestamps: true });

// Virtual for id to match frontend expectation
productSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Ensure virtuals are serialized
productSchema.set('toJSON', {
    virtuals: true
});

module.exports = mongoose.model('Product', productSchema);
