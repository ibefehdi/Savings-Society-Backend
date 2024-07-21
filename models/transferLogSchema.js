const mongoose = require('mongoose');

const transferLogSchema = new mongoose.Schema({
    shareholder: { type: mongoose.Schema.Types.ObjectId, ref: 'Shareholder', required: true },
    fromSavings: { type: mongoose.Schema.Types.ObjectId, ref: 'Savings', required: true },
    toAmanat: { type: mongoose.Schema.Types.ObjectId, ref: 'Amanat'},
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    transferType: { type: String, enum: ['Amanat', 'Savings'] },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('TransferLog', transferLogSchema);