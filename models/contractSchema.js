const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({

    flatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Flat',
    },
    tenantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tenant',
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    rentAmount: {
        type: Number,
        default: null
    },
    collectionDay: {
        type: Number,
        min: 1,
        max: 31,
    },
    expired: { type: Boolean, required: true },
    contractDocument: {
        path: { type: String },
        fileType: { type: String, enum: ['image', 'pdf'] }
    }
});
contractSchema.pre('save', function (next) {
    if (this.endDate <= new Date() && !this.expired) {
        this.expired = true;
        this.flatId = null
        this.model('ContractHistory').create({
            flatId: this.flatId,
            tenantId: this.tenantId,
            startDate: this.startDate,
            endDate: this.endDate,
            expired: true,
            rentAmount: this.rentAmount,
            collectionDay: this.collectionDay,
        });
    }
    next();
});
module.exports = mongoose.model('Contract', contractSchema);