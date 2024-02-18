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
            date: new Date(),
            year: new Date().getFullYear(),
        }
        const share = await Share.create(sanitizedShare)
        const adminId = (req.body.adminId);

        const adminIdWithTimestamp = adminId.map(admin => ({
            ...admin,
            timestamp: new Date()
        }));
        const adminIdWithOutTimestamp = adminId[0]?.admin
        console.log("This is the adminId", adminIdWithOutTimestamp);
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
            membershipStatus: 0,
            dateOfDeath: null,
            resignationDate: null,
            createdByAdmin: adminIdWithOutTimestamp,
            workplace: sanitizeInput(req.body.workplace),
            email: sanitizeInput(req.body.email),
            poBox: sanitizeInput(req.body.poBox),
            zipCode: sanitizeInput(req.body.zipCode),
            Area: sanitizeInput(req.body.area),
            Country: sanitizeInput(req.body.country),
            address: address?._id,
            share: share?._id,
            savings: savings?._id
        }
        console.log(sanitizedShareholder);

        const shareholder = await Shareholder.create(sanitizedShareholder);
        res.status(200).send({ status: 0, message: "Shareholder Saved Successfully.", shareholder })
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message })
    }
}
exports.editShareholder = async (req, res) => {
    try {
        const shareholderId = req.params.id;
        const userId = req.body.userId; // Capture the userId from the request body

        // Check if userId is provided
        if (!userId) {
            return res.status(400).send({ status: 3, message: "UserId is required to edit the shareholder." });
        }
        // Find the shareholder by ID
        const shareholder = await Shareholder.findById(shareholderId);
        if (!shareholder) {
            return res.status(404).send({ status: 2, message: "Shareholder not found." });
        }

        // Update shareholder fields if they are provided in the request body
        shareholder.fName = sanitizeInput(req.body.fName) || shareholder.fName;
        shareholder.lName = sanitizeInput(req.body.lName) || shareholder.lName;
        shareholder.DOB = sanitizeInput(req.body.dob) || shareholder.DOB;
        shareholder.civilId = sanitizeInput(req.body.civilId) || shareholder.civilId;
        shareholder.ibanNumber = sanitizeInput(req.body.ibanNumber) || shareholder.ibanNumber;
        shareholder.mobileNumber = sanitizeInput(req.body.mobileNumber) || shareholder.mobileNumber;
        shareholder.status = req.body.status || shareholder.status;
        shareholder.membershipStatus = req.body.membershipStatus || shareholder.membershipStatus;
        shareholder.dateOfDeath = req.body.dateOfDeath ? new Date(req.body.dateOfDeath) : shareholder.dateOfDeath;
        shareholder.resignationDate = req.body.resignationDate ? new Date(req.body.resignationDate) : shareholder.resignationDate;
        shareholder.workplace = sanitizeInput(req.body.workplace) || shareholder.workplace;
        shareholder.email = sanitizeInput(req.body.email) || shareholder.email;
        shareholder.poBox = sanitizeInput(req.body.poBox) || shareholder.poBox;
        shareholder.zipCode = sanitizeInput(req.body.zipCode) || shareholder.zipCode;
        shareholder.Area = sanitizeInput(req.body.area) || shareholder.Area;
        shareholder.Country = sanitizeInput(req.body.country) || shareholder.Country;
        shareholder.lastEditedBy.push(userId);
        // Update the address associated with the shareholder
        if (shareholder.address) {
            const address = await Address.findById(shareholder.address);
            if (address) {
                address.block = sanitizeInput(req.body.block) || address.block;
                address.street = sanitizeInput(req.body.street) || address.street;
                address.house = sanitizeInput(req.body.house) || address.house;
                address.avenue = sanitizeInput(req.body.avenue) || address.avenue;
                address.city = sanitizeInput(req.body.city) || address.city;
                await address.save(); // Save the updated address
                console.log(address);
            }
        }

        // Save the updated shareholder information
        await shareholder.save();

        res.status(200).send({ status: 0, message: "Shareholder updated successfully.", shareholder });
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message });
    }
};

exports.addSavingsToShareholder = async (req, res) => {
    try {
        const id = req.params.id;
        const newAmount = req.body.newAmount;
        const adminId = req.body.adminId;
        const currentSavings = await Saving.findById(id);
        if (!currentSavings) {
            return res.status(404).send({ message: "Savings not found." });
        }
        console.log(currentSavings);
        const currentAmount = currentSavings.currentAmount;
        const adminIdWithTimestamp = adminId.map(admin => ({
            ...admin,
            amountBeforeChange: currentAmount,
            timestamp: new Date()
        }));
        console.log(adminIdWithTimestamp);
        // Update the Savings document
        const savings = await Saving.findOneAndUpdate(
            { _id: id },
            {
                $set: { currentAmount: newAmount },
                $push: { adminId: { $each: adminIdWithTimestamp } }
            },
            { new: true }
        );
        console.log(savings)
        if (!savings) {
            return res.status(404).send({ status: 2, message: "Savings not found." });
        }
        res.status(200).send({ status: 0, message: "Savings updated successfully.", savings });
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message });
    }
};
exports.withdrawWealth = async (req, res) => {
    try {
        const id = req.params.id;
        const shareholder = await Shareholder.findOne({ _id: id }).populate('savings');
        if (!shareholder) {
            return res.status(404).send({ message: 'Shareholder not found' });
        }
        const response = {
            share: shareholder.share,
            savings: shareholder.savings
        };
        res.status(200).send(response);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
};
