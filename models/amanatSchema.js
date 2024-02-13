const mongoose = require('mongoose');
const amanatSchema = new mongoose.Schema({
    initialAmount: { type: Number },
    currentAmount: { type: Number },
    date: { type: Date },
}, { timestamps: true })

module.exports = mongoose.model('Amanat', amanatSchema);