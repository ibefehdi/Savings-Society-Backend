const mongoose = require('mongoose');
const withdrawalHistory = new mongoose.Schema({
    shareholder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shareholder',
        required: true
    },
    savings: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Savings',
    },
    shares: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Share',
    },
    amanat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Amanat',
    },
    previousAmount: { type: String },
    newAmount: { type: String },
    withdrawalDate: { type: Date },
    type: { type: String },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    year: { type: String }
})
module.exports = mongoose.model('WithdrawalHistory', withdrawalHistory)