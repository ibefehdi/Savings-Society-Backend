const Shareholder = require('../models/shareholderSchema');
const xss = require('xss');
const bcrypt = require('bcrypt');
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

function sanitizeInput(input) {
    return xss(input);
}

exports.createShareholder = async (req, res) => {
    try {
        const sanitizedAddress = {
            block: sanitizeInput(req.body.block),
            street: sanitizeInput(req.body.street),
            house: sanitizeInput(req.body.house),
            avenue: sanitizeInput(req.body.avenue),
            city: sanitizeInput(req.body.city),
        }
        const sanitizedShareholder = {
            fName: sanitizeInput(req.body.fName),
            lName: sanitizeInput(req.body.lName),
            DOB: sanitizeInput(req.body.dob),
            civilId: sanitizeInput(req.body.civilId),
            ibanNumber: sanitizeInput(req.body.ibanNumber),
            mobileNumber: sanitizeInput(req.body.mobileNumber),
            address: sanitizedAddress._id
        }
        const shareholder = await Shareholder.create(sanitizedShareholder);
        res.status(200).send(shareholder)
    } catch (err) {
        console.log(err.message);
    }
}
