const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Order extends Model { }

Order.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    customer: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING
    },
    userId: {
        type: DataTypes.STRING
    },
    date: {
        type: DataTypes.STRING
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Processing'
    },
    paymentMethod: {
        type: DataTypes.STRING,
        defaultValue: 'COD'
    },
    discount: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    coupon: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    items: {
        type: DataTypes.JSON,
        defaultValue: [],
        get() {
            const rawValue = this.getDataValue('items');
            return typeof rawValue === 'string' ? JSON.parse(rawValue) : (rawValue || []);
        }
    }
}, {
    sequelize,
    modelName: 'Order',
    tableName: 'Orders',
    timestamps: true
});

Order.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
};

module.exports = Order;
