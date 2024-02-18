const mongoose = require('mongoose');
const shareConfigSchema = new mongoose.Schema({
    year: Number,
    individualSharePercentage: Number,
})

module.exports = mongoose.model('ShareConfig', shareConfigSchema);
