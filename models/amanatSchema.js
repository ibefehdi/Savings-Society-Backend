const mongoose = require('mongoose');
const amanatSchema = new mongoose.Schema({

    amount: { type: Number },
    withdrawn: { type: Boolean, default: false },
    date: { type: Date },
    year: { type: String },

}, { timestamps: true })

module.exports = mongoose.model('Amanat', amanatSchema);