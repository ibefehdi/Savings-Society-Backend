const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', },
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  description: { type: String },
});

module.exports = mongoose.model('Income', transactionSchema);