const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  buildingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Building', },
  flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['Income', 'Expense'], required: true },
  transactionFrom: { type: String, enum: ['Hall', 'Flat'], required: true },
  description: { type: String },
});

module.exports = mongoose.model('Transaction', transactionSchema);