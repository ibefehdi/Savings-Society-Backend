const mongoose = require('mongoose');
const tenantHistorySchema = new mongoose.Schema({
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
});
module.exports = mongoose.model('TenantHistory', tenantHistorySchema)