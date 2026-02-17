const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Coupon extends Model { }

Coupon.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    discountType: {
        type: DataTypes.ENUM('percentage', 'fixed'),
        defaultValue: 'percentage'
    },
    value: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    minPurchase: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    expiryDate: {
        type: DataTypes.DATE
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    sequelize,
    modelName: 'Coupon',
    tableName: 'Coupons',
    timestamps: true
});

Coupon.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
};

module.exports = Coupon;
