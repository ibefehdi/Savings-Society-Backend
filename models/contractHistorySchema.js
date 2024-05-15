const mongoose = require('mongoose');

const contractHistorySchema = new mongoose.Schema({
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat', required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    expired: { type: Boolean, default: false },
    rentAmount: {
        type: Number,
        required: true,
    },
    collectionDay: {
        type: Number,
        min: 1,
        max: 31,
    },
    createdAt: { type: Date, default: Date.now }
});

const ContractHistory = mongoose.model('ContractHistory', contractHistorySchema);

module.exports = ContractHistory;
