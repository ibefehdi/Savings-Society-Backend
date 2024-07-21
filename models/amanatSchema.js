const mongoose = require('mongoose');
const amanatSchema = new mongoose.Schema({
    amount: {
        type: Number,
        get: v => v,
        set: v => parseFloat(v)
    },
    withdrawn: { type: Boolean, default: false },
    date: { type: Date },
    year: { type: String },

}, { timestamps: true })
amanatSchema.set('toObject', { getters: true });
amanatSchema.set('toJSON', { getters: true });


module.exports = mongoose.model('Amanat', amanatSchema);