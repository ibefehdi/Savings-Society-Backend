const mongoose = require('mongoose');
const amanatSchema = new mongoose.Schema({
    
    amount: { type: Number },
    date: { type: Date },
}, { timestamps: true })

module.exports = mongoose.model('Amanat', amanatSchema);