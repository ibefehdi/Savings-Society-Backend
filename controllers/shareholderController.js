const Shareholder = require('../models/shareholderSchema');
const Address = require('../models/addressSchema');
const Share = require('../models/shareSchema');
const Saving = require('../models/savingsSchema');

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
        const sanitizedShare = {
            amount: sanitizeInput(req.body.shareAmount),
            initialAmount: sanitizeInput(req.body.shareInitialPrice),
            currentAmount: sanitizeInput(req.body.shareInitialPrice),
            date: new Date()
        }
        const share = await Share.create(sanitizedShare)
        const adminId = (req.body.adminId);

        const adminIdWithTimestamp = adminId.map(admin => ({
            ...admin,
            timestamp: new Date()
        }));
        console.log(adminIdWithTimestamp);
        const sanitizedSavings = {
            initialAmount: sanitizeInput(req.body.savingsInitialPrice),
            currentAmount: sanitizeInput(req.body.savingsInitialPrice),
            adminId: adminIdWithTimestamp,
            date: new Date()
        }
        const savings = await Saving.create(sanitizedSavings)

        const sanitizedShareholder = {
            fName: sanitizeInput(req.body.fName),
            lName: sanitizeInput(req.body.lName),
            DOB: sanitizeInput(req.body.dob),
            civilId: sanitizeInput(req.body.civilId),
            ibanNumber: sanitizeInput(req.body.ibanNumber),
            mobileNumber: sanitizeInput(req.body.mobileNumber),
            status: req.body.status,

            address: address?._id,
            share: share?._id,
            savings: savings?._id
        }
        console.log(sanitizedShareholder);

        const shareholder = await Shareholder.create(sanitizedShareholder);
        res.status(200).send({ message: "Shareholder Saved Successfully.", shareholder })
    } catch (err) {
        res.status(400).send({ message: err.message })
    }
}
exports.addSavingsToShareholder = async (req, res) => {
    try {
        const id = req.params.id;
        const newAmount = sanitizeInput(req.body.newAmount);
        const adminId = req.body.adminId;
        const currentSavings = await Saving.findById(id);
        if (!currentSavings) {
            return res.status(404).send({ message: "Savings not found." });
        }

        const currentAmount = currentSavings.currentAmount;
        const adminIdWithTimestamp = adminId.map(admin => ({
            ...admin,
            amountBeforeChange: currentAmount,
            timestamp: new Date()
        }));

        // Update the Savings document
        const savings = await Saving.findOneAndUpdate(
            { _id: id },
            {
                $set: { currentAmount: newAmount },
                $push: { adminId: { $each: adminIdWithTimestamp } }
            },
            { new: true }
        );

        if (!savings) {
            return res.status(404).send({ message: "Savings not found." });
        }

        res.status(200).send({ message: "Savings updated successfully.", savings });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
};
exports.withdrawWealth = async (req,res)=>{
    try{

    }catch (err) {
        res.status(400).send({ message: err.message });

    }
}