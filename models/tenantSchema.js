const mongoose = require('mongoose');
const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contactNumber: { type: String },
    civilId: { type: String },
    type: { type: String, enum: ['Public', 'Private'] },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
});
module.exports = mongoose.model('Tenant', tenantSchema)