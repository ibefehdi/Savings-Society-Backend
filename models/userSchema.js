const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fName: { type: String, required: true },
    lName: { type: String, required: true },
    isActive: { type: Boolean },
    isAdmin: {
        type: Boolean, default: null
    },
    phoneNo: { type: String, default: null },
    email: { type: String, default: null },
    type: [{ type: String, enum: ['Shareholder', 'Rental'] }],
    permissions: {
        shareholder: {
            create: { type: Boolean, default: false, default: null },
            view: { type: Boolean, default: false, default: null },
            edit: { type: Boolean, default: false, default: null },
            delete: { type: Boolean, default: false, default: null }
        },
        user: {
            create: { type: Boolean, default: false, default: null },
            view: { type: Boolean, default: false, default: null },
            edit: { type: Boolean, default: false, default: null },
            delete: { type: Boolean, default: false, default: null }
        },
        deposit: {
            shares: { type: Boolean, default: false, default: null },
            savings: { type: Boolean, default: false, default: null },
        },
        withdrawal: {
            shares: { type: Boolean, default: false, default: null },
            savings: { type: Boolean, default: false, default: null },
        },
        financialConfiguration: {
            shares: { type: Boolean, default: false, default: null },
            savings: { type: Boolean, default: false, default: null },
        },
        amanat: {
            create: { type: Boolean, default: false, default: null },
            view: { type: Boolean, default: false, default: null },
            edit: { type: Boolean, default: false, default: null },
            delete: { type: Boolean, default: false, default: null }
        }
    }
});
module.exports = mongoose.model('User', userSchema);