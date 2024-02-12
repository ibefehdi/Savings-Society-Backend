const Shareholder = require('../models/shareholderSchema');
const Address = require('../models/addressSchema');
const xss = require('xss');


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
        const address = await Address.create(sanitizedAddress);
        const sanitizedShareholder = {
            fName: sanitizeInput(req.body.fName),
            lName: sanitizeInput(req.body.lName),
            DOB: sanitizeInput(req.body.dob),
            civilId: sanitizeInput(req.body.civilId),
            ibanNumber: sanitizeInput(req.body.ibanNumber),
            mobileNumber: sanitizeInput(req.body.mobileNumber),
            address: address._id
        }
        const shareholder = await Shareholder.create(sanitizedShareholder);
        res.status(200).send({message:"Shareholder Saved Successfully.",shareholder})
    } catch (err) {
        console.log(err.message);
    }
}