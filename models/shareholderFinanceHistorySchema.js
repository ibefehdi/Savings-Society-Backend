const mongoose = require('mongoose');
const shareholderFinanceHistorySchema = new mongoose.Schema({
    shareholder: { type: mongoose.Schema.Types.ObjectId, ref: 'Shareholder' },
    share: { type: mongoose.Schema.Types.ObjectId, ref: 'Share' },
    savings: { type: mongoose.Schema.Types.ObjectId, ref: 'Savings' },
    year: { type: Number }
})
module.exports = mongoose.model('ShareholderFinanceHistory', shareholderFinanceHistorySchema);