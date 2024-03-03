const mongoose = require('mongoose');
const withdrawalLogSchema = new mongoose.Schema({
    shareholder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shareholder',
        required: true
    },
    saving: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Savings',
        required: true
    },
    link: {
        type: String,
        required: true
    },
})
module.exports = mongoose.model('WithdrawalLog', withdrawalLogSchema);
