const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Product extends Model {
    static associate(models) {
        // Example: Product.hasMany(models.Review)
    }
}

Product.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    brand: {
        type: DataTypes.STRING
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    rating: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false
    },
    gender: {
        type: DataTypes.STRING
    },
    images: {
        type: DataTypes.JSON,
        get() {
            const rawValue = this.getDataValue('images');
            return typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        }
    },
    description: {
        type: DataTypes.TEXT
    },
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 24
    },
    inStock: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    reviews: {
        type: DataTypes.JSON,
        defaultValue: [],
        get() {
            const rawValue = this.getDataValue('reviews');
            return typeof rawValue === 'string' ? JSON.parse(rawValue) : (rawValue || []);
        }
    },
    numReviews: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    sequelize,
    modelName: 'Product',
    tableName: 'Products',
    timestamps: true
});

Product.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
};

module.exports = Product;
