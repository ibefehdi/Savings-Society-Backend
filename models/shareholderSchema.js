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
    civilId: { type: String, required: true },
    ibanNumber: { type: String },
    mobileNumber: { type: String },
    address: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    serial: { type: Number }
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
