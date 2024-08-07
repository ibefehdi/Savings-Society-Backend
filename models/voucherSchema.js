const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building' },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    amount: { type: Number, required: true },
    pendingDate: { type: Date, },
    paidDate: { type: Date, },
    status: { type: String, enum: ['Pending', 'Paid'], required: true },
    voucherNo: { type: String }
});

module.exports = mongoose.model('Voucher', voucherSchema);