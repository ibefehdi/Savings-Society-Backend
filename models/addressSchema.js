const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    block: { type: String },
    street: { type: String },
    house: { type: String },
    avenue: { type: String, },
    city: { type: String },
})
module.exports = mongoose.model('Address', addressSchema);
