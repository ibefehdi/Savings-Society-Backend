const mongoose = require('mongoose');
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('Counter', counterSchema);
const addressSchema = new mongoose.Schema({
    block: { Type: Number },
    street: { Type: String },
    house: { Type: String },
    avenue: { Type: String, optional: true },
    city: { Type: String },
})
const Address = mongoose.model('Address', addressSchema);

const shareholderSchema = new mongoose.Schema({
    fName: { Type: String },
    lName: { Type: String },
    DOB: { Type: Date },
    civilID: { Type: String, required: true },
    ibanNumber: { Type: String },
    mobileNumber: { Type: String },
    address: { Type: mongoose.Schema.Types.ObjectId, ref: 'Address' },
    serial: { Type: Number }
})
shareholderSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const counter = await Counter.findByIdAndUpdate(
                { _id: 'serial' },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );


            this.requestID = counter.seq;

            next();
        } catch (error) {

            next(error);
        }
    } else {
        next();
    }
});
const Shareholder = mongoose.model('Shareholder', shareholderSchema)