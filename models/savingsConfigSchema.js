const mongoose = require('mongoose');
const savingsConfigSchema = new mongoose.Schema({
    year: Number,
    individualSharePercentage: Number,
    withdrawn: Boolean,
})
module.exports = mongoose.model('SavingsConfig', savingsConfigSchema);