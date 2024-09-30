const mongoose = require('mongoose');
const tenantHistorySchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
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
        default: null
    },
});
module.exports = mongoose.model('TenantHistory', tenantHistorySchema)