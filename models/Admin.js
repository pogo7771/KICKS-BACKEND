const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin extends Model { }

Admin.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    bio: {
        type: DataTypes.STRING,
    },
    avatar: {
        type: DataTypes.STRING,
    },
    twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    failedLoginAttempts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    lockedUntil: {
        type: DataTypes.DATE,
        defaultValue: null
    },
    resetPasswordToken: {
        type: DataTypes.STRING,
        defaultValue: null
    },
    resetPasswordExpires: {
        type: DataTypes.DATE,
        defaultValue: null
    }
}, {
    sequelize,
    modelName: 'Admin',
    tableName: 'Admins',
    timestamps: true,
    hooks: {
        beforeSave: async (admin) => {
            if (admin.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                admin.password = await bcrypt.hash(admin.password, salt);
            }
        }
    }
});

Admin.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    values._id = values.id;
    delete values.password;
    return values;
};

Admin.prototype.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = Admin;
