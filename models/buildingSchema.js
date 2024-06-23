const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
    no: { type: String, required: true },
    name: { type: String, required: true },
    floors: { type: Number },
    type: { type: String },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
});
module.exports = mongoose.model('Building', buildingSchema);