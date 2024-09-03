const mongoose = require('mongoose');
const bookingSchema = new mongoose.Schema({
    hallId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Building',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    dateOfEvent: {
        type: Date,
    },
    startTime: {
        type: String,
        required: true
    },
    endTime: {
        type: String,
        required: true
    },
    rate: {
        type: Number,
        required: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher' },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    active: {
        type: Boolean
    }
})
module.exports = mongoose.model('Booking', bookingSchema);
