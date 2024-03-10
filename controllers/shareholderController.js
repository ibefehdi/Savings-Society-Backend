const Shareholder = require('../models/shareholderSchema');
const Address = require('../models/addressSchema');
const Share = require('../models/shareSchema');
const Saving = require('../models/savingsSchema');
const WithdrawalLog = require('../models/withdrawalLogSchema')
const xss = require('xss');


function sanitizeInput(input) {
    return xss(input);
}
exports.getAllShareholders = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const status = req.query.status || 0;
        const fName = req.query.fName || '';
        const lName = req.query.lName || '';
        const civilId = req.query.civilId || '';
        const membershipStatus = req.query.membershipStatus || '';
        const serial = req.query.serial || '';
        let queryConditions = {};
        if (status) {
            queryConditions.status = status;
        }
        if (fName) {
            queryConditions.fName = { $regex: fName, $options: 'i' };
        }
        if (civilId) {
            queryConditions.civilId = { $regex: `^${civilId}`, $options: 'i' };
        }
        if (membershipStatus) {
            queryConditions.membershipStatus = membershipStatus;
        }
        if (lName) {
            queryConditions.lName = { $regex: lName, $options: 'i' };
        }
        if (serial) {
            queryConditions.serial = parseInt(serial, 10);
        }

        const shareholders = await Shareholder.find(queryConditions)
            .populate({
                path: 'savings', // First, populate the savings document
                populate: {
                    path: 'amanat', // Within savings, further populate amanat
                    model: 'Amanat' // Ensure you specify the correct model name for amanat if it's not automatically inferred
                }
            })
            .populate('share')
            .populate('address')
            .skip(skip)
            .limit(resultsPerPage);

        const total = await Shareholder.countDocuments(queryConditions);
        res.status(200).send({
            data: shareholders,
            count: total,
            metadata: { total: total }
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getShareholderActiveCount = async (req, res) => {
    try {
        const count = await Shareholder.countDocuments({ status: 0, membershipStatus: 0 });
        res.status(200).send({ count: count });
    } catch (err) {
        res.status(500).send({ message: err.message });

    }
}
exports.getShareholderCount = async (req, res) => {
    try {
        const count = await Shareholder.countDocuments();
        res.status(200).send({ count: count });
    } catch (err) {
        res.status(500).send({ message: err.message });

    }
}
exports.getShareholderById = async (req, res) => {
    try {
        const shareholderId = req.params.id;
        const shareholder = await Shareholder.findById(shareholderId)
            .populate('savings')
            .populate('share')
            .populate('address');

        if (!shareholder) {
            return res.status(404).send({ message: 'Shareholder not found' });
        }

        res.status(200).send({ shareholder });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
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
        const shareAmount = sanitizeInput(req.body.shareAmount);
        const shareInitialPrice = sanitizeInput(req.body.shareInitialPrice);
        if (!shareAmount || !shareInitialPrice || shareAmount == 0 || shareInitialPrice == 0) {
            return res.status(400).send({ code: 2, message: "Cannot create shareholder without buying share" });
        }
        const sanitizedShare = {
            amount: shareAmount,
            initialAmount: shareInitialPrice,
            currentAmount: shareInitialPrice,
            withdrawn: false,
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
            withdrawn: false,
            adminId: adminIdWithTimestamp,
            date: new Date()
        }
        const savings = await Saving.create(sanitizedSavings)

        const sanitizedShareholder = {
            fName: sanitizeInput(req.body.fName),
            arabFName: sanitizeInput(req.body.arabFName),
            lName: sanitizeInput(req.body.lName),
            arabLName: sanitizeInput(req.body.arabLName),
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
        res.status(201).send({ status: 0, message: "Shareholder Saved Successfully.", shareholder })
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message })
    }
}
exports.editShareholder = async (req, res) => {
    try {
        const shareholderId = req.params.id;
        const userId = req.body.adminId; // Capture the userId from the request body

        // Check if userId is provided
        if (!userId) {
            return res.status(400).send({ status: 3, message: "adminId is required to edit the shareholder." });
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
        shareholder.arabLName = sanitizeInput(req.body.arabLName) || shareholder.arabLName;
        shareholder.arabFName = sanitizeInput(req.body.arabFName) || shareholder.arabFName;
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

        console.log("This is the savings", shareholder.savings);
        console.log("This is the membership status", shareholder.membershipStatus);
        // Save the updated shareholder information
        await shareholder.save();
        if ((shareholder.membershipStatus === 1 || shareholder.status === 1 || shareholder.status === 2) && shareholder.savings) {
            const savings = await Saving.findById(shareholder.savings);
            if (savings) {
                savings.withdrawn = true;
                await savings.save();
            }
            const shar = await Share.findById(shareholder?.share?._id);
            if (shar) {
                shar.withdrawn = true;
                await shar.save();
            }

        }
        res.status(201).send({ status: 0, message: "Shareholder updated successfully.", shareholder });
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message });
    }
};

exports.addSavingsToShareholder = async (req, res) => {
    try {
        const id = req.params.id; // Shareholder ID
        const newAmount = Number(req.body.newAmount); // The amount being added
        const adminId = req.body.adminId; // Admin ID(s) making the change

        // Retrieve the current savings for the specified shareholder
        const currentSavings = await Shareholder.findById(id).populate('savings');

        if (!currentSavings || !currentSavings.savings) {
            return res.status(404).send({ message: "Savings not found." });
        }

        // Prepare adminId with timestamp and previous amount for audit purposes
        const adminIdWithTimestamp = adminId.map(admin => ({
            ...admin,
            amountBeforeChange: currentSavings.savings.currentAmount,
            timestamp: new Date()
        }));

        // Update the Savings document with the new amount and record the addition
        const updatedSavings = await Saving.findOneAndUpdate(
            { _id: currentSavings.savings._id },
            {
                $set: { currentAmount: currentSavings.savings.currentAmount + newAmount },
                $push: {
                    additions: { amount: newAmount, date: new Date() }, // Record this addition
                    adminId: { $each: adminIdWithTimestamp } // Assuming this is for audit/logging
                }
            },
            { new: true } // Return the updated document
        );

        if (!updatedSavings) {
            return res.status(404).send({ message: "Savings update failed." });
        }

        res.status(200).send({ message: "Savings updated successfully.", savings: updatedSavings });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
};

exports.addSharesToShareholder = async (req, res) => {
    try {
        const id = req.params.id;
        const newShareAmount = Number(req.body.newAmount);
        const adminId = req.body.adminId;
        const currentShares = await Shareholder.findById(id).populate('share');
        if (!currentShares || !currentShares.share) {
            return res.status(404).send({ message: "Shareholder or their shares not found." });
        }
        const currentAmount = Number(currentShares.share.currentAmount);

        const adminIdWithTimestamp = adminId.map(admin => ({
            ...admin,
            amountBeforeChange: currentAmount,
            timestamp: new Date()
        }));

        // Update the Share document associated with the Shareholder
        const updatedShare = await Share.findByIdAndUpdate(
            currentShares.share._id,
            {
                $set: { currentAmount: currentAmount + newShareAmount },
                $push: { adminId: { $each: adminIdWithTimestamp } }
            },
            { new: true }
        );

        if (!updatedShare) {
            return res.status(404).send({ status: 2, message: "Share not found." });
        }

        res.status(200).send({ status: 0, message: "Shares updated successfully.", share: updatedShare });
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message });
    }
};

exports.withdrawWealth = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        const status = req.body.status;
        const membershipStatus = req.body.membershipStatus;
        // Find the shareholder and populate the necessary references
        const shareholder = await Shareholder.findOne({ _id: id }).populate('savings').populate('share');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        shareholder.lastEditedBy.push(userId);
        shareholder.status = status;
        shareholder.membershipStatus = membershipStatus;
        await shareholder.save();

        if (shareholder.savings) {
            await Saving.findByIdAndUpdate(shareholder.savings._id, { $set: { withdrawn: true } });
        }

        // Update shares if they exist
        if (shareholder.share) {
            await Share.findByIdAndUpdate(shareholder.share._id, { $set: { withdrawn: true } });

        }
        // Refetch or update the necessary documents to reflect changes
        const updatedSavings = await Saving.findById(shareholder.savings._id);

        // Construct and send the response
        const response = {
            shareholder: shareholder,
            share: shareholder.share,
            savings: updatedSavings
        };

        res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName} has withdrawn their wealth.` });
    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};

exports.withdrawSavings = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;

        const shareholder = await Shareholder.findOne({ _id: id }).populate('savings');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        // Check if savings have already been withdrawn
        if (shareholder.savings && shareholder.savings.withdrawn) {
            const response = {
                shareholder: shareholder,
                savings: shareholder.savings,
                link: `/printsavingswithdrawal/${shareholder.id}`
            };
            return res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName}'s savings have already been withdrawn.` });
        }
        shareholder.lastEditedBy.push(userId);
        await shareholder.save();

        if (shareholder.savings) {
            await Saving.findByIdAndUpdate(shareholder.savings._id, { $set: { withdrawn: true } });
        }
        const updatedSavings = await Saving.findById(shareholder.savings._id);
        const withdrawalLog = new WithdrawalLog({
            shareholder: shareholder._id,
            saving: updatedSavings._id,
            link: `/printsavingswithdrawal/${shareholder.id}`
        });

        // Save the WithdrawalLog to the database
        await withdrawalLog.save();
        const response = {
            shareholder: shareholder,
            savings: updatedSavings,
            link: `/printsavingswithdrawal/${shareholder.id}`
        };
        res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName} has withdrawn their Savings.` });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.getShareholderFinancials = async (req, res) => {
    try {
        const id = req.params.id;
        const shareholder = await Shareholder.findOne({ _id: id }).populate('share').populate('savings').populate('amanat');
        console.log(shareholder);
        const response = {
            savings: shareholder.savings,
            shares: shareholder.share,
            amanat: shareholder.amanat
        }
        res.status(200).send({ status: 0, response, message: "The financials of the user have been sent" })
    } catch (err) {
        console.error('Error getting financials of this user. ', err)
        res.status(500).json({ message: "Error getting user: " + err.message });

    }
};
exports.withdrawShares = async (req, res) => {
    try {
        const id = req.params.id; // Assuming this is the shareholder's ID
        const userId = req.body.userId;

        const shareholder = await Shareholder.findById(id).populate('share');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        // Check if the share has already been withdrawn
        if (shareholder.share && shareholder.share.withdrawn) {
            const response = {
                shareholder: shareholder,
                share: shareholder.share, // Adjusted to treat share as a singular object
                link: `/printsavingswithdrawal/${shareholder.id}`
            };
            return res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName}'s savings have already been withdrawn.` });
        }

        // Withdraw share
        if (shareholder.share) {
            await Share.findByIdAndUpdate(shareholder.share._id, { $set: { withdrawn: true } });
            // Optionally, create a log for the withdrawn share
        }

        shareholder.lastEditedBy.push(userId);
        await shareholder.save();
        const response = {
            shareholder: shareholder,
            share: shareholder.share, // Adjusted to treat share as a singular object
            link: `/printshareswithdrawal/${shareholder.id}`
        };
        res.status(200).send({ status: 0, message: `${shareholder.fName} ${shareholder.lName} has withdrawn their Savings.`, response });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};

