const mongoose = require('mongoose');

const workplaceSchema = new mongoose.Schema({
    id: { type: String },
    description: { type: String },
    nameArabic: { type: String },
})
module.exports = mongoose.model('Workplace', workplaceSchema)