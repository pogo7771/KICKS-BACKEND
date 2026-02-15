const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
    event: { type: String, required: true }, // e.g., 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'PASSWORD_CHANGE'
    userEmail: { type: String, required: true },
    ipAddress: { type: String },
    details: { type: String },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'WARNING'], default: 'SUCCESS' }
}, { timestamps: true });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
