const mongoose = require('mongoose');
const ShareConfig = require('./shareConfigSchema')
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);
const adminIdSchema = new mongoose.Schema({
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Date }
});

const shareholderSchema = new mongoose.Schema({
    fName: { type: String },
    arabFName: { type: String },
    lName: { type: String },
    arabLName: { type: String },
    DOB: { type: Date },
    civilId: { type: String, required: true, unique: true },
    status: { type: Number, enum: [0, 1, 2] }, //0 is active, 1 is inactive/amount withdrawn, 2 is Expired/Death
    membershipStatus: { type: Number, enum: [0, 1] },
    office: { type: String },
    profitWithdraw: { type: Number, enum: [0, 1, 2] },
    email: { type: String },
    poBox: { type: String },
    zipCode: { type: String },
    createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    Area: { type: String },
    dateOfDeath: { type: Date },
    resignationDate: { type: Date },
    Country: { type: String },
    ibanNumber: { type: String },
    mobileNumber: { type: String },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    serial: { type: Number },
    share: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Share' }],
    savings: { type: mongoose.Schema.Types.ObjectId, ref: 'Savings' },
    lastEditedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    amanat: { type: mongoose.Schema.Types.ObjectId, ref: 'Amanat' }
})

shareholderSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'serial' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );
            this.serial = counter.seq;
            next();
        } catch (error) {

            next(error);
        }
    } else {
        next();
    }
});
module.exports = mongoose.model('Shareholder', shareholderSchema);
