const mongoose = require('mongoose');

const receiptVoucherSerialSchema = new mongoose.Schema({
    serialNumber: Number
});

// Pre-save middleware
receiptVoucherSerialSchema.pre('save', async function (next) {
    if (this.isNew) {
        const lastVoucher = await this.constructor.findOne().sort('-serialNumber');
        this.serialNumber = lastVoucher ? lastVoucher.serialNumber + 1 : 1;
    }
    next();
});

module.exports = mongoose.model('ReceiptVoucherSerial', receiptVoucherSerialSchema);
