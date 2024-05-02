const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    floors: { type: Number },
    type: { type: String, enum: ['Building', 'Hall'] },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
});
module.exports = mongoose.model('Building', buildingSchema);