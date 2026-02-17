const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Settings extends Model { }

Settings.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    theme: {
        type: DataTypes.STRING,
        defaultValue: 'light'
    },
    currency: {
        type: DataTypes.STRING,
        defaultValue: 'USD'
    },
    notificationsEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    lastUpdated: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Settings',
    tableName: 'Settings',
    timestamps: true
});

Settings.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
};

module.exports = Settings;
