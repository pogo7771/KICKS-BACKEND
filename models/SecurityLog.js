const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class SecurityLog extends Model { }

SecurityLog.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    event: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userEmail: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.STRING
    },
    severity: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        defaultValue: 'LOW'
    },
    status: {
        type: DataTypes.ENUM('SUCCESS', 'FAILURE'),
        defaultValue: 'SUCCESS'
    }
}, {
    sequelize,
    modelName: 'SecurityLog',
    tableName: 'SecurityLogs',
    timestamps: true // Creates createdAt, updatedAt
});

SecurityLog.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    return values;
};

module.exports = SecurityLog;
