const mongoose = require('mongoose');
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);

const shareholderSchema = new mongoose.Schema({
    fName: { type: String },
    lName: { type: String },
    DOB: { type: Date },
    civilId: { type: String, required: true, unique: true },
    status: { type: Number, enum: [0, 1, 2] }, //0 is active, 1 is inactive/amount withdrawn, 2 is Expired/Death
    ibanNumber: { type: String },
    mobileNumber: { type: String },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    serial: { type: Number },
    share: { type: mongoose.Schema.Types.ObjectId, ref: 'Share' },
    savings: { type: mongoose.Schema.Types.ObjectId, ref: 'Savings' },
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
