const mongoose = require('mongoose');
const tenantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    contactNumber: { type: String },
    civilId: { type: String },
    active: { type: Boolean, required: true },
    // type: { type: String, enum: ['Public', 'Private'] },
    flatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Flat' },
    civilIdDocument: {
        path: { type: String },
        fileType: { type: String, enum: ['image', 'pdf'] }
    }
});
module.exports = mongoose.model('Tenant', tenantSchema)