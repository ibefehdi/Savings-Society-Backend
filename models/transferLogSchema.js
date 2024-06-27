const mongoose = require('mongoose');

const transferLogSchema = new mongoose.Schema({
    shareholder: { type: mongoose.Schema.Types.ObjectId, ref: 'Shareholder', required: true },
    fromSavings: { type: mongoose.Schema.Types.ObjectId, ref: 'Savings', required: true },
    toAmanat: { type: mongoose.Schema.Types.ObjectId, ref: 'Amanat', required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('TransferLog', transferLogSchema);