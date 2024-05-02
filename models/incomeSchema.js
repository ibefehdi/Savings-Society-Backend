const mongoose = require('mongoose');
const incomeSchema = new mongoose.Schema({
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat', required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    description: { type: String },
});
module.exports = mongoose.model('Income', incomeSchema);