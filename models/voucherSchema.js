const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
    amount: { type: Number, required: true },
    pendingDate: { type: Date, },
    paidDate: { type: Date, },
    status: { type: String, enum: ['Pending', 'Paid'], required: true },
});

module.exports = mongoose.model('Voucher', voucherSchema);