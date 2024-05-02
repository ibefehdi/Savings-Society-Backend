const mongoose = require('mongoose')
const expenseSchema = new mongoose.Schema({
    buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', required: true },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    description: { type: String },
});
module.exports = mongoose.model('Expense', expenseSchema);