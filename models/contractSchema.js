const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
    flatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat',
        required: true,
    },
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    rentAmount: {
        type: Number,
        required: true,
    },
    collectionDay: {
        type: Number,
        min: 1,
        max: 31,
    },
    expired: { type: Boolean, required: true },
});

module.exports = mongoose.model('Contract', contractSchema);