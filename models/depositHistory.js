const mongoose = require('mongoose');
const depositHistory = new mongoose.Schema({
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
    previousAmount: { type: String },
    newAmount: { type: String },
    depositDate: { type: Date },
    type: { type: String },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
})
module.exports = mongoose.model('DepositHistory', depositHistory)