const mongoose = require('mongoose')
const flatSchema = new mongoose.Schema({
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
    flatNumber: { type: String },
    floorNumber: { type: String, required: true },
    tenant: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
    vacant: { type: Boolean, required: true },
});
module.exports = mongoose.model('Flat', flatSchema);