const Shareholder = require('../models/shareholderSchema');
const Address = require('../models/addressSchema');
const Share = require('../models/shareSchema');
const Amanat = require('../models/amanatSchema');
const Saving = require('../models/savingsSchema');
const WithdrawalLog = require('../models/withdrawalLogSchema')
const DepositHistory = require('../models/depositHistory');
const WithdrawalHistory = require('../models/withdrawalHistory');

const { stringify } = require('csv-stringify');
const moment = require('moment');
const XLSX = require('xlsx');
const xss = require('xss');
const mongoose = require('mongoose');

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
        const gender = req.query.gender || '';
        const serial = req.query.serial || '';
        const currentYear = new Date().getFullYear();

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
        if (gender) {
            queryConditions.gender = gender;
        }

        const shareholders = await Shareholder.find(queryConditions)
            .populate({
                path: 'savings',
                match: { year: currentYear }, // Match only the current year's savings
                populate: {
                    path: 'amanat',
                    model: 'Amanat'
                }
            })
            .populate({
                path: 'share',
                match: { year: currentYear } // Match only the current year's shares
            })
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

exports.getAllShareholdersFormatted = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const status = req.query.status || 0;
        const fName = req.query.fName || '';
        const lName = req.query.lName || '';
        const civilId = req.query.civilId || '';
        const membershipStatus = req.query.membershipStatus || '';
        const gender = req.query.gender || '';
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
        if (gender) {
            queryConditions.gender = gender;
        }

        const shareholders = await Shareholder.find(queryConditions)
            .populate({
                path: 'savings',
                populate: {
                    path: 'amanat',
                    model: 'Amanat'
                }
            })
            .populate('share')
            .populate('address')



        const csvStringifier = stringify({ header: true });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="shareholders.csv"');
        csvStringifier.pipe(res);

        shareholders.forEach(shareholder => {
            const shareholderObject = shareholder.toObject();

            // Directly format the ISO 8601 date string using moment
            if (shareholderObject.DOB) {
                shareholderObject.DOB = moment(shareholderObject.DOB).format('DD-MM-YYYY');
            } else {
                // Handle missing DOB.
                shareholderObject.DOB = 'Missing date';
            }

            csvStringifier.write(shareholderObject);
        });

        csvStringifier.end();

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
        // Sanitize and create address
        const sanitizedAddress = {
            block: sanitizeInput(req.body.block),
            street: sanitizeInput(req.body.street),
            house: sanitizeInput(req.body.house),
            avenue: sanitizeInput(req.body.avenue),
            city: sanitizeInput(req.body.city),
        };
        const address = await Address.create(sanitizedAddress);

        // Sanitize and create share
        const shareAmount = sanitizeInput(req.body.shareAmount);
        const shareInitialPrice = sanitizeInput(req.body.shareInitialPrice);
        const sanitizedShare = {
            amount: shareAmount,
            initialAmount: shareInitialPrice,
            currentAmount: shareInitialPrice,
            withdrawn: false,
            date: new Date(req.body.joinDate),
            year: new Date(req.body.joinDate).getFullYear(),
        };
        const share = await Share.create(sanitizedShare);

        // Prepare admin IDs with timestamps
        const adminId = req.body.adminId;
        const adminIdWithTimestamp = adminId.map(admin => ({
            ...admin,
            timestamp: new Date()
        }));
        const adminIdWithoutTimestamp = adminId[0]?.admin;

        // Sanitize and create savings
        const sanitizedSavings = {
            initialAmount: sanitizeInput(req.body.savingsInitialPrice),
            currentAmount: sanitizeInput(req.body.savingsInitialPrice),
            withdrawn: false,
            adminId: adminIdWithTimestamp,
            date: new Date(req.body.joinDate),
            year: new Date(req.body.joinDate).getFullYear(),
        };
        const savings = await Saving.create(sanitizedSavings);

        // Prepare the shareholder data
        const sanitizedShareholder = {
            fName: sanitizeInput(req.body.fName),
            arabFName: sanitizeInput(req.body.arabFName),
            lName: sanitizeInput(req.body.lName),
            arabLName: sanitizeInput(req.body.arabLName),
            fullName: sanitizeInput(req.body.fullName),
            membersCode: req.body.membersCode,
            DOB: new Date(req.body.dob),
            civilId: sanitizeInput(req.body.civilId),
            ibanNumber: sanitizeInput(req.body.ibanNumber),
            mobileNumber: sanitizeInput(req.body.mobileNumber),
            gender: sanitizeInput(req.body.gender),
            status: req.body.status,
            membershipStatus: 0,
            createdByAdmin: adminIdWithoutTimestamp,
            workplace: sanitizeInput(req.body.workplace),
            email: sanitizeInput(req.body.email),
            poBox: sanitizeInput(req.body.poBox),
            zipCode: sanitizeInput(req.body.zipCode),
            Area: sanitizeInput(req.body.area),
            Country: sanitizeInput(req.body.country),
            joinDate: new Date(req.body.joinDate),
            quitDate: req.body.quitDate ? new Date(req.body.quitDate) : null,
            address: address._id,
            share: [share._id],
            savings: [savings._id]
        };

        // Create shareholder
        const shareholder = await Shareholder.create(sanitizedShareholder);
        res.status(201).send({ status: 0, message: "Shareholder Saved Successfully.", shareholder });
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message });
    }
};

exports.createShareholderBackup = async (req, res) => {
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

        const approvalDate = req.body.approvalDate;
        const year = req.body.year;
        const withdrawn = req.body.withdrawn;
        console.log("This is the withdrawn:", withdrawn);
        console.log(year);
        const sanitizedShare = {
            amount: shareAmount,
            initialAmount: shareInitialPrice,
            currentAmount: shareInitialPrice,
            withdrawn: withdrawn,
            date: new Date(approvalDate),
            year: new Date(approvalDate).getFullYear(),
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
            withdrawn: withdrawn,
            adminId: adminIdWithTimestamp,
            date: new Date(approvalDate),
            year: new Date(approvalDate).getFullYear(),

        }
        const savings = await Saving.create(sanitizedSavings)

        const sanitizedShareholder = {
            fName: sanitizeInput(req.body.fName),
            arabFName: sanitizeInput(req.body.arabFName),
            lName: sanitizeInput(req.body.lName),
            arabLName: sanitizeInput(req.body.arabLName),
            fullName: sanitizeInput(req.body.fullName),
            membersCode: req.body.membersCode,
            DOB: sanitizeInput(req.body.dob),
            civilId: sanitizeInput(req.body.civilId),
            ibanNumber: sanitizeInput(req.body.ibanNumber),
            mobileNumber: sanitizeInput(req.body.mobileNumber),
            gender: sanitizeInput(req.body.gender),
            status: withdrawn === "false" ? 1 : 0,
            membershipStatus: withdrawn === "false" ? 1 : 0,
            dateOfDeath: null,
            resignationDate: null,
            createdByAdmin: adminIdWithOutTimestamp,
            workplace: sanitizeInput(req.body.workplace),
            email: sanitizeInput(req.body.email),
            poBox: sanitizeInput(req.body.poBox),
            zipCode: sanitizeInput(req.body.zipCode),
            Area: sanitizeInput(req.body.area),
            Country: sanitizeInput(req.body.country),
            joinDate: sanitizeInput(req.body.joinDate),
            // quitDate: sanitizeInput(req.body.quitDate),
            address: address?._id,
            share: [share?._id],
            savings: [savings?._id]
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
        const userId = req.body.adminId;

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
        shareholder.quitDate = new Date(req.body.quitDate) || shareholder.quitDate;
        shareholder.gender = sanitizeInput(req.body.gender) || shareholder.gender;
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
        const id = req.params.id;
        const newAmount = Number(req.body.newAmount);
        const adminId = req.body.adminId;
        const year = req.body.year || new Date().getFullYear(); // Use provided year or current year

        // Find the shareholder with populated savings for the current year
        const shareholder = await Shareholder.findById(id).populate({
            path: 'savings',
            match: { year: year } // Filter to populate only the current year's savings
        });

        if (!shareholder) {
            return res.status(404).send({ message: "Shareholder not found." });
        }

        let savingsRecord;
        if (shareholder.savings.length > 0) {
            // Existing savings record for the year found
            savingsRecord = shareholder.savings[0];

            // Update savings record with new amount and admin details
            const oldAmount = savingsRecord.currentAmount;
            savingsRecord.currentAmount += newAmount;  // Add new amount to existing current amount
            savingsRecord.adminId.push({
                adminId: adminId,
                amountBeforeChange: oldAmount,
                timestamp: new Date()
            });
            await savingsRecord.save();

            // Record this transaction in deposit history
            const depositSavings = {
                shareholder: id,
                savings: savingsRecord._id,
                previousAmount: oldAmount,
                newAmount: savingsRecord.currentAmount,
                admin: adminId,
                type: "Savings",
                depositDate: new Date()
            };
            await DepositHistory.create(depositSavings);

        } else {
            // No existing savings record for the year, create new
            savingsRecord = await Saving.create({
                initialAmount: newAmount,
                currentAmount: newAmount,
                withdrawn: false,
                adminId: [],
                date: new Date(),
                year: year
            });
            shareholder.savings.push(savingsRecord._id); // Add to shareholder's savings array
            await shareholder.save(); // Save the updated shareholder record
        }

        res.status(200).send({
            message: "Savings updated successfully.",
            savings: savingsRecord,
            shareholder: shareholder
        });
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
};



exports.addSharesToShareholder = async (req, res) => {
    try {
        const id = req.params.id;
        const newShareAmount = Number(req.body.newAmount);
        const adminId = req.body.adminId;
        const year = req.body.year || new Date().getFullYear();  // Use provided year or current year

        // Retrieve the shareholder with shares populated for the current year
        const shareholder = await Shareholder.findById(id).populate({
            path: 'share',
            match: { year: year } // Filter to populate only this year's shares
        });

        if (!shareholder) {
            return res.status(404).send({ status: 404, message: "Shareholder not found." });
        }

        let sharesRecord;
        if (shareholder.share.length > 0) {
            // Existing share record for the year found
            sharesRecord = shareholder.share[0];
        } else {
            // No existing shares record for the year, create a new one
            sharesRecord = await Share.create({
                amount: newShareAmount,
                initialAmount: newShareAmount, 
                currentAmount: newShareAmount,
                adminId: [],
                date: new Date(),
                year: year
            });
            shareholder.share.push(sharesRecord._id); // Add to shareholder's share array
            await shareholder.save(); // Save the updated shareholder record
        }

        // Update shares record with new amount and admin details
        const oldAmount = sharesRecord.currentAmount;
        sharesRecord.currentAmount += newShareAmount;
        sharesRecord.amount += newShareAmount; 
        sharesRecord.adminId.push({
            adminId: adminId,
            amountBeforeChange: oldAmount,
            timestamp: new Date()
        });
        await sharesRecord.save();

        // Record this transaction in deposit history
        const depositShare = {
            shareholder: id,
            shares: sharesRecord._id,
            previousAmount: oldAmount,
            newAmount: sharesRecord.currentAmount,
            admin: adminId,
            type: "Shares",
            depositDate: new Date(),
            year: year
        };

        await DepositHistory.create(depositShare);

        res.status(200).send({
            status: 200,
            message: "Shares updated successfully.",
            share: sharesRecord
        });
    } catch (err) {
        res.status(400).send({ status: 400, message: err.message });
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
exports.withdrawAmanat = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        const amountToWithdraw = req.body.amountToWithdraw;
        const shareholder = await Shareholder.findOne({ _id: id }).populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        });
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }
        console.log("This is amanat", shareholder.savings.amanat);
        // Check if savings have already been withdrawn
        if (shareholder.savings.amanat && shareholder.savings.amanat.withdrawn) {
            const response = {
                shareholder: shareholder,
                savings: shareholder.savings.amanat,
                link: `/printsavingswithdrawal/${shareholder.id}`
            };
            return res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName}'s savings have already been withdrawn.` });
        }
        shareholder.lastEditedBy.push(userId);
        await shareholder.save();


        // Retrieve the current amount from the savings
        const currentAmount = shareholder.savings.amanat.amount;
        console.log("This is the current amount", currentAmount);
        // Check if there's enough balance to withdraw
        if (amountToWithdraw > currentAmount) {
            return res.status(400).send({ status: 2, message: "Insufficient funds to withdraw." });
        }

        // Determine whether the withdrawn flag should be true or false
        const isFullyWithdrawn = amountToWithdraw === currentAmount;
        console.log("this is the fully withdrwan", isFullyWithdrawn);
        // Update the savings document with the new current amount and set withdrawn accordingly
        await Amanat.findByIdAndUpdate(shareholder.savings.amanat._id, {
            $set: {
                amount: currentAmount - amountToWithdraw,
                withdrawn: isFullyWithdrawn
            }
        });


        const updatedSavings = await Amanat.findById(shareholder.savings.amanat._id);
        const withdrawalLog = new WithdrawalLog({
            shareholder: shareholder._id,
            saving: updatedSavings._id,
            link: `/printsavingswithdrawal/${shareholder.id}`
        });

        // Save the WithdrawalLog to the database
        await withdrawalLog.save();
        const response = {
            shareholder: shareholder,
            amanat: updatedSavings,
            link: `/printsavingswithdrawal/${shareholder.id}`
        };
        const withdrawAmanat = {
            shareholder: id,
            amanat: updatedSavings._id,
            previousAmount: currentAmount,
            newAmount: updatedSavings.amount,
            admin: userId,
            type: "Amanat",
            withdrawalDate: Date.now()
        };

        const updatedDepositHistory = await WithdrawalHistory.create([withdrawAmanat]);
        res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName} has withdrawn their Savings.` });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.getUserAmanat = async (req, res) => {
    try {
        const id = req.params.id;

        const shareholder = await Shareholder.findOne({ _id: id }).populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        });
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }




        const updatedSavings = shareholder.savings.amanat
        const withdrawalLog = new WithdrawalLog({
            shareholder: shareholder._id,
            saving: updatedSavings._id,
            link: `/printsavingswithdrawal/${shareholder.id}`
        });

        // Save the WithdrawalLog to the database
        await withdrawalLog.save();
        const response = {

            amanat: updatedSavings,

        };
        res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName} has withdrawn their Savings.` });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.withdrawSavings = async (req, res) => {
    try {
        const id = req.params.id;
        const adminId = req.body.adminId;
        console.log("this is the userId", adminId);
        const year = new Date().getFullYear();
        const amountToWithdraw = req.body.amountToWithdraw;
        const shareholder = await Shareholder.findById(id).populate({
            path: 'savings',
            match: { year: year }
        });
        console.log(shareholder.savings[0]);
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }
        const oldAmount = shareholder.savings[0].currentAmount;

        // Check if savings have already been withdrawn
        if (shareholder.savings && shareholder.savings[0].withdrawn) {
            const response = {
                shareholder: shareholder,
                savings: shareholder.savings,
                link: `/printsavingswithdrawal/${shareholder.id}`
            };
            return res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName}'s savings have already been withdrawn.` });
        }
        shareholder.lastEditedBy.push(adminId);
        await shareholder.save();
        if (shareholder.savings) {
            // Retrieve the current amount from the savings
            const currentAmount = shareholder.savings[0].currentAmount;

            // Check if there's enough balance to withdraw
            if (amountToWithdraw > currentAmount) {
                return res.status(400).send({ status: 2, message: "Insufficient funds to withdraw." });
            }

            // Determine whether the withdrawn flag should be true or false
            const isFullyWithdrawn = amountToWithdraw === currentAmount;

            // Update the savings document with the new current amount and set withdrawn accordingly
            await Saving.findByIdAndUpdate(shareholder.savings[0]._id, {
                $set: {
                    currentAmount: currentAmount - amountToWithdraw,
                    withdrawn: isFullyWithdrawn
                }
            });
        }

        const updatedSavings = await Saving.findById(shareholder.savings[0]._id);
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
        const WithdrawSavings = {
            shareholder: id,
            savings: updatedSavings._id,
            previousAmount: oldAmount,
            newAmount: updatedSavings.currentAmount,
            admin: adminId,
            type: "Savings",
            withdrawalDate: Date.now()
        };

        const updatedupdatedHistory = await WithdrawalHistory.create([WithdrawSavings]);
        res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName} has withdrawn their Savings.` });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.getShareholderFinancials = async (req, res) => {
    try {
        const id = req.params.id;
        const year = new Date().getFullYear();

        const shareholder = await Shareholder.findOne({ _id: id })
            .populate({
                path: 'share',
                match: { year: year }
            })
            .populate({
                path: 'savings',
                match: { year: year },
                populate: {
                    path: 'amanat',
                    model: 'Amanat'
                }
            });

        console.log(shareholder);

        // Ensure we have the data available
        if (!shareholder || (!shareholder.savings.length && !shareholder.share.length)) {
            return res.status(404).json({
                status: 1,
                message: "No financials found for the given user and year."
            });
        }

        const response = {
            savings: shareholder.savings.length ? shareholder.savings[0] : null,
            shares: shareholder.share.length ? shareholder.share[0] : null,
            amanat: shareholder.savings.length && shareholder.savings[0].amanat ? shareholder.savings[0].amanat : null
        };

        res.status(200).send({
            status: 0,
            response,
            message: "The financials of the user have been sent"
        });
    } catch (err) {
        console.error('Error getting financials of this user. ', err)
        res.status(500).json({
            message: "Error getting user: " + err.message
        });
    }
};

exports.withdrawShares = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        const amountToWithdraw = req.body.amountToWithdraw;

        const shareholder = await Shareholder.findById(id).populate('share');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        // Check if the share has already been withdrawn
        if (shareholder.share && shareholder.share.withdrawn) {
            const response = {
                shareholder: shareholder,
                share: shareholder.share,
                link: `/printsavingswithdrawal/${shareholder.id}`
            };
            return res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName}'s savings have already been withdrawn.` });
        }

        // Withdraw share
        if (shareholder.share) {
            const currentAmount = shareholder.share.currentAmount;

            // Check if there's enough balance to withdraw
            if (amountToWithdraw > currentAmount) {
                return res.status(400).send({ status: 2, message: "Insufficient funds to withdraw." });
            }

            // Determine whether the withdrawn flag should be true or false
            const isFullyWithdrawn = amountToWithdraw === currentAmount;

            // Update the savings document with the new current amount and set withdrawn accordingly
            await Share.findByIdAndUpdate(shareholder.share._id, {
                $set: {
                    currentAmount: currentAmount - amountToWithdraw,
                    withdrawn: isFullyWithdrawn
                }
            });
        }

        shareholder.lastEditedBy.push(userId);
        await shareholder.save();
        const response = {
            shareholder: shareholder,
            share: shareholder.share,
            link: `/printshareswithdrawal/${shareholder.id}`
        };
        res.status(200).send({ status: 0, message: `${shareholder.fName} ${shareholder.lName} has withdrawn their Savings.`, response });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};

