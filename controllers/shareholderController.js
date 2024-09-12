const Shareholder = require('../models/shareholderSchema');
const Address = require('../models/addressSchema');
const Share = require('../models/shareSchema');
const Amanat = require('../models/amanatSchema');
const Saving = require('../models/savingsSchema');
const WithdrawalLog = require('../models/withdrawalLogSchema')
const DepositHistory = require('../models/depositHistory');
const WithdrawalHistory = require('../models/withdrawalHistory');
const Workplace = require('../models/workplaceSchema');
const TransferLog = require('../models/transferLogSchema');
const { stringify } = require('csv-stringify');
const moment = require('moment');
const XLSX = require('xlsx');
const xss = require('xss');
const excel = require('exceljs');
const mongoose = require('mongoose');

function sanitizeInput(input) {
    return xss(input);
}
exports.getAllShareholders = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const fName = req.query.fName || '';
        const lName = req.query.lName || '';
        const civilId = req.query.civilId || '';
        const membershipStatus = req.query.membershipStatus || '';
        const workplace = req.query.workplace || '';
        const gender = req.query.gender || '';
        const membersCode = req.query.membersCode || '';
        const status = req.query.status || 0;
        const area = req.query.area || '';
        const currentYear = new Date().getFullYear();
        console.log(workplace)
        let queryConditions = {
        };

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
        if (membersCode) {
            queryConditions.membersCode = parseInt(membersCode, 10);
        }
        if (gender) {
            queryConditions.gender = gender;
        }
        if (status) {
            queryConditions.status = status || 0;
        }
        if (workplace) {
            queryConditions.workplace = workplace || '';
        }
        if (area) {
            queryConditions.Area = area;
        }
        const shareholders = await Shareholder.find(queryConditions)
            .populate({
                path: 'savings',
                populate: {
                    path: 'amanat',
                    model: 'Amanat'
                }
            })
            .populate({
                path: 'share',
            })
            .populate('address')
            .skip(skip)
            .limit(resultsPerPage);

        const total = await Shareholder.countDocuments(queryConditions);
        const shareholdersWithTotalInterest = shareholders.map(shareholder => {
            const savingsIncrease = shareholder.savings ? shareholder.savings.savingsIncrease : 0;
            const shareIncrease = shareholder.share ? shareholder.share.shareIncrease : 0;
            const totalInterest = savingsIncrease + shareIncrease;

            return {
                ...shareholder.toObject(),
                totalInterest: totalInterest.toFixed(3)
            };
        });
        res.status(200).send({
            data: shareholdersWithTotalInterest,
            count: total,
            metadata: { total: total }
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
exports.assignIbanToShareholder = async (req, res) => {
    const { membersCode, iban } = req.body;

    if (!membersCode || !iban) {
        return res.status(400).json({ message: 'membersCode and IBAN are required' });
    }

    try {
        const shareholder = await Shareholder.findOne({ membersCode: membersCode });

        if (!shareholder) {
            return res.status(404).json({ message: 'Shareholder not found' });
        }

        shareholder.ibanNumber = iban;
        await shareholder.save();

        res.status(200).json({
            message: 'IBAN assigned successfully',
            shareholder: {
                membersCode: shareholder.membersCode,
                fullName: shareholder.fullName,
                ibanNumber: shareholder.ibanNumber
            }
        });
    } catch (error) {
        console.error('Error assigning IBAN:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getShareholdersWithAmanat = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        const shareholders = await Shareholder.find()
            .populate({
                path: 'savings',
                match: { amanat: { $exists: true, $ne: null } },
                populate: {
                    path: 'amanat',
                    model: 'Amanat'
                }
            })
            .skip(skip)
            .limit(resultsPerPage);
        const shareholdersWithAmanat = shareholders.filter(shareholder =>
            shareholder.savings && shareholder.savings.amanat && shareholder.savings.amanat.amount !== 0
        );
        const total = await Shareholder.countDocuments({
            'savings.amanat': { $exists: true, $ne: null }
        });
        res.status(200).send({
            data: shareholdersWithAmanat,
            count: count,
            metadata: { total: total }
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
exports.changeAlRaseed = async (req, res) => {
    try {
        const userId = req.params.id;
        const newBalance = req.body.balance;

        if (typeof newBalance !== 'number' || isNaN(newBalance)) {
            return res.status(400).json({ message: 'Invalid balance provided' });
        }

        const shareholder = await Shareholder.findOne({ _id: userId }).populate('savings');

        if (!shareholder) {
            return res.status(404).json({ message: 'Shareholder not found' });
        }

        shareholder.savings.alraseed = newBalance;
        await Saving.findByIdAndUpdate(shareholder.savings._id, { alraseed: newBalance });

        res.status(200).json({ message: 'Balance updated successfully', newBalance });
    } catch (err) {
        console.error('Error in changeAlRaseed:', err);
        res.status(500).json({ message: 'An error occurred while updating the balance' });
    }
}
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
        const membersCode = req.query.membersCode || '';

        let queryConditions = {};
        if (status) queryConditions.status = status;
        if (fName) queryConditions.fName = { $regex: fName, $options: 'i' };
        if (civilId) queryConditions.civilId = { $regex: `^${civilId}`, $options: 'i' };
        if (membershipStatus) queryConditions.membershipStatus = membershipStatus;
        if (lName) queryConditions.lName = { $regex: lName, $options: 'i' };
        if (membersCode) queryConditions.membersCode = parseInt(membersCode, 10);
        if (gender) queryConditions.gender = gender;

        const shareholders = await Shareholder.find(queryConditions)

            .select('fName DOB civilId joinDate ibanNumber mobileNumber address share savings membersCode')
            .populate('address')
            .populate('share')
            .populate({ path: 'savings', populate: { path: 'amanat', model: 'Amanat' } });

        const csvStringifier = stringify({
            header: true,
            columns: [
                'رقم العضوية',
                'اسم المساهم',
                'تاريخ الميلاد',
                'رقم مدني',
                'تاريخ الانتساب',
                'ايبان البنك',
                'رقم التليفون',
                'بلوك',
                'شارع',
                'منزل',
                'عدد الاسهم',
                'قيم الاسهم',
                'قيمة المدخرات'
            ]
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="shareholders.csv"');
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        shareholders.forEach((shareholder, index) => {
            let shareCurrentAmount = 0;
            if (shareholder.share && shareholder.share.purchases) {
                shareCurrentAmount = shareholder.share.totalAmount || 0;
            }

            let savingsCurrentAmount = 0;
            let amanatAmount = 0;
            if (shareholder.savings) {
                savingsCurrentAmount = shareholder.savings.totalAmount || 0;
                if (shareholder.savings.amanat) {
                    amanatAmount = shareholder.savings.amanat.amount || 0;
                }
            }
            console.log("Shareholder mobile number:", shareholder.mobileNumber); // Add this line for debugging

            const row = {
                'رقم العضوية': shareholder.membersCode || (skip + index + 1),
                'اسم المساهم': shareholder.fName,
                'تاريخ الميلاد': shareholder.DOB ? moment(shareholder.DOB).format('DD/MM/YYYY') : '',
                'رقم مدني': shareholder.civilId || 'NULL',
                'تاريخ الانتساب': shareholder.joinDate ? moment(shareholder.joinDate).format('DD/MM/YYYY') : '',
                'ايبان البنك': shareholder.ibanNumber || '0',
                'رقم التليفون': shareholder.mobileNumber || shareholder.mobileNumber === '' ? shareholder.mobileNumber : 'N/A',
                'بلوك': shareholder.address ? shareholder.address.block : '',
                'شارع': shareholder.address ? shareholder.address.street : '',
                'منزل': shareholder.address ? shareholder.address.house : '',
                'عدد الاسهم': (shareholder.share && shareholder.share.totalShareAmount) ? shareholder.share.totalShareAmount : '0.000',
                'قيم الاسهم': shareholder.share.totalAmount.toFixed(0),
                'قيمة المدخرات': (savingsCurrentAmount)
            };

            csvStringifier.write(row);
        });

        csvStringifier.end();

    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
exports.getAllShareholdersSharesFormatted = async (req, res) => {
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
        const membersCode = req.query.membersCode || '';

        let queryConditions = {};
        if (status) queryConditions.status = status;
        if (fName) queryConditions.fName = { $regex: fName, $options: 'i' };
        if (civilId) queryConditions.civilId = { $regex: `^${civilId}`, $options: 'i' };
        if (membershipStatus) queryConditions.membershipStatus = membershipStatus;
        if (lName) queryConditions.lName = { $regex: lName, $options: 'i' };
        if (membersCode) queryConditions.membersCode = parseInt(membersCode, 10);
        if (gender) queryConditions.gender = gender;


        const shareholders = await Shareholder.find(queryConditions)
            .select('fName DOB civilId joinDate ibanNumber phoneNumber address share membersCode')
            .populate('address')
            .populate('share');

        const csvStringifier = stringify({
            header: true,
            columns: [
                'رقم العضوية',
                'الاسم',
                'تاريخ الميلاد',
                'الرقم المدني',
                'تاريخ الانتساب',
                'الايبان',
                'رقم الهاتف',
                'العنوان',
                'قيمة السهم',
                'عدد الأسهم'
            ]
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="shareholders_shares.csv"');
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        shareholders.forEach((shareholder, index) => {
            let shareCurrentAmount = 0;
            if (shareholder.share && shareholder.share.purchases) {
                shareCurrentAmount = shareholder.share.totalAmount || 0;
            }

            const row = {
                'رقم العضوية': shareholder.membersCode || (skip + index + 1),
                'الاسم': shareholder.fName,
                'تاريخ الميلاد': shareholder.DOB ? moment(shareholder.DOB).format('DD/MM/YYYY') : '',
                'الرقم المدني': shareholder.civilId || 'NULL',
                'تاريخ الانتساب': shareholder.joinDate ? moment(shareholder.joinDate).format('DD/MM/YYYY') : '',
                'الايبان': shareholder.ibanNumber || '0',
                'رقم الهاتف': shareholder.phoneNumber || 'N/A',
                'العنوان': shareholder.address ? `Block ${shareholder.address.block}, Street ${shareholder.address.street}, House ${shareholder.address.house}` : '',
                'قيمة السهم': Math.floor(shareholder.share.totalAmount),
                'عدد الأسهم': (shareholder.share && shareholder.share.totalShareAmount) ? Math.floor(shareholder.share.totalShareAmount) : '0.000'
            };

            csvStringifier.write(row);
        });

        csvStringifier.end();


    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};
exports.getAllShareholdersSavingsFormatted = async (req, res) => {
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
        const membersCode = req.query.membersCode || '';

        let queryConditions = {};
        if (status) queryConditions.status = status;
        if (fName) queryConditions.fName = { $regex: fName, $options: 'i' };
        if (civilId) queryConditions.civilId = { $regex: `^${civilId}`, $options: 'i' };
        if (membershipStatus) queryConditions.membershipStatus = membershipStatus;
        if (lName) queryConditions.lName = { $regex: lName, $options: 'i' };
        if (membersCode) queryConditions.membersCode = parseInt(membersCode, 10);
        if (gender) queryConditions.gender = gender;

        const shareholders = await Shareholder.find(queryConditions)
            .select('fName DOB civilId joinDate ibanNumber phoneNumber address savings membersCode')
            .populate('address')
            .populate({ path: 'savings', populate: { path: 'amanat', model: 'Amanat' } });

        const csvStringifier = stringify({
            header: true,
            columns: [
                'رقم العضوية',
                'الاسم',
                'تاريخ الميلاد',
                'الرقم المدني',
                'تاريخ الانتساب',
                'الايبان',
                'رقم الهاتف',
                'العنوان',
                'مدخرات',
                'فائدة المدخرات',
                'أمانات'
            ]
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="shareholders_savings.csv"');
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        shareholders.forEach((shareholder, index) => {
            let savingsCurrentAmount = 0;
            let amanatAmount = 0;
            if (shareholder.savings) {
                savingsCurrentAmount = shareholder.savings.totalAmount || 0;
                if (shareholder.savings.amanat) {
                    amanatAmount = shareholder.savings.amanat.amount || 0;
                }
            }

            const row = {
                'رقم العضوية': shareholder.membersCode || (skip + index + 1),
                'الاسم': shareholder.fName,
                'تاريخ الميلاد': shareholder.DOB ? moment(shareholder.DOB).format('DD/MM/YYYY') : '',
                'الرقم المدني': shareholder.civilId || 'NULL',
                'تاريخ الانتساب': shareholder.joinDate ? moment(shareholder.joinDate).format('DD/MM/YYYY') : '',
                'الايبان': shareholder.ibanNumber || '0',
                'رقم الهاتف': shareholder.phoneNumber || 'N/A',
                'العنوان': shareholder.address ? `Block ${shareholder.address.block}, Street ${shareholder.address.street}, House ${shareholder.address.house}` : '',
                'مدخرات': (savingsCurrentAmount),
                'فائدة المدخرات': shareholder.savings.savingsIncrease,
                'أمانات': amanatAmount
            };

            csvStringifier.write(row);
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
            .populate({
                path: 'savings',
                populate: {
                    path: 'amanat'
                }
            })
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
exports.getShareholderByMembersCode = async (req, res) => {
    try {
        const { membersCode } = req.body;
        const shareholder = await Shareholder.findOne({ membersCode })
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
};
exports.createShareholder = async (req, res) => {
    try {
        const lastMember = await Shareholder.findOne({}, { membersCode: 1 })
            .sort({ membersCode: -1 })
            .collation({ locale: "en_US", numericOrdering: true });
        console.log(lastMember)
        const newMembersCode = lastMember ? Number(lastMember.membersCode) + 1 : 1;
        // Sanitize and create address
        const sanitizedAddress = {
            block: sanitizeInput(req.body.block),
            street: sanitizeInput(req.body.street),
            house: sanitizeInput(req.body.house),
            avenue: sanitizeInput(req.body.avenue),
            city: sanitizeInput(req.body.city),
        };
        const address = await Address.create(sanitizedAddress);
        const adminId = req.body.adminId;
        const adminIdWithTimestamp = adminId.map(admin => ({
            ...admin,
            timestamp: new Date()
        }));
        const adminIdWithoutTimestamp = adminId[0]?.admin;
        // Sanitize and create share
        const shareAmount = sanitizeInput(req.body.shareAmount);
        const shareInitialPrice = sanitizeInput(req.body.shareInitialPrice);
        const sanitizedShare = {
            purchases: [{
                amount: shareAmount,
                initialAmount: shareInitialPrice,
                currentAmount: shareInitialPrice,
                date: new Date(req.body.joinDate),
                lastUpdateDate: new Date()
            }],
            totalAmount: shareInitialPrice,
            totalShareAmount: shareAmount,
            year: new Date(req.body.joinDate).getFullYear(),
            adminId: adminIdWithTimestamp,
            withdrawn: false
        };
        const share = await Share.create(sanitizedShare);

        // Prepare admin IDs with timestamps

        const savingsInitialPrice = req.body.savingsInitialPrice ? sanitizeInput(req.body.savingsInitialPrice) : 0;
        const sanitizedSavings = {
            deposits: [{
                initialAmount: savingsInitialPrice,
                currentAmount: savingsInitialPrice,
                date: new Date(req.body.joinDate),
                lastUpdateDate: new Date()
            }],
            totalAmount: savingsInitialPrice,
            savingsIncrease: 0,
            withdrawn: false,
            maxReached: false,
            adminId: adminIdWithTimestamp,
            year: new Date(req.body.joinDate).getFullYear().toString(),
        };
        const savings = await Saving.create(sanitizedSavings);

        // Prepare the shareholder data
        const sanitizedShareholder = {
            fName: sanitizeInput(req.body.fName),
            arabFName: sanitizeInput(req.body.arabFName),
            lName: sanitizeInput(req.body.lName),
            arabLName: sanitizeInput(req.body.arabLName),
            fullName: sanitizeInput(req.body.fullName),
            membersCode: req.body.membersCode ? req.body.membersCode : newMembersCode,
            DOB: new Date(req.body.dob),
            civilId: sanitizeInput(req.body.civilId),
            bankName: sanitizeInput(req.body.bankName),
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
            Country: "كويت",
            joinDate: new Date(req.body.joinDate),
            quitDate: req.body.quitDate ? new Date(req.body.quitDate) : null,
            address: address._id,
            share: [share._id],
            savings: savings._id
        };
        console.log(sanitizedShareholder);
        // Create shareholder
        const shareholder = await Shareholder.create(sanitizedShareholder);
        res.status(201).send({ status: 0, message: "Shareholder Saved Successfully.", shareholder });
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message });
    }
};
exports.makeUserInactive = async (req, res) => {
    try {
        const id = req.params.id;
        const quitDate = new Date(req.body.quitDate);
        const status = req.body.status;
        const shareholder = await Shareholder.findById(id);
        console.log(status)
        if (!shareholder) {
            return res.status(404).send({ status: 0, message: 'Shareholder not found' });
        }
        console.log("quitDate: " + quitDate + " status: " + status)
        shareholder.status = status;
        if (status === 2) {
            shareholder.membershipStatus = 1;
        } else {
            shareholder.membershipStatus = status;
        }
        shareholder.quitDate = quitDate;

        await shareholder.save();

        res.status(200).send({ status: 1, message: 'Shareholder updated successfully', shareholder });
    } catch (err) {
        res.status(400).send({ status: 0, message: err.message });
    }
};
exports.makeUserActive = async (req, res) => {
    try {
        const id = req.params.id;
        const status = req.body.status;
        const shareholder = await Shareholder.findById(id);
        console.log(status)
        if (!shareholder) {
            return res.status(404).send({ status: 0, message: 'Shareholder not found' });
        }
        shareholder.status = status;
        if (status === 0) {
            shareholder.membershipStatus = 0;
        } else {
            shareholder.membershipStatus = status;
        }
        // shareholder.quitDate = quitDate;

        await shareholder.save();

        res.status(200).send({ status: 1, message: 'Shareholder updated successfully', shareholder });
    } catch (err) {
        res.status(400).send({ status: 0, message: err.message });
    }
};
exports.updateShareholderSavings = async (req, res) => {
    try {
        const membersCode = req.body.membersCode;
        const newBalance = req.body.Balance;

        // Find the shareholder based on the membersCode
        const shareholder = await Shareholder.findOne({ membersCode: membersCode });

        if (!shareholder) {
            return res.status(404).send({ status: 1, message: "Shareholder not found" });
        }

        // Find the savings document associated with the shareholder
        const savings = await Saving.findById(shareholder.savings);

        if (!savings) {
            return res.status(404).send({ status: 1, message: "Savings record not found" });
        }

        // Update the savings totalAmount with the new balance
        savings.totalAmount = newBalance;
        await savings.save();

        res.status(200).send({
            status: 0,
            message: "Savings updated successfully",
            savings,
        });
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
            area: sanitizeInput(req.body.area),
        };
        const address = await Address.create(sanitizedAddress);
        const workplaceId = sanitizeInput(req.body.workplaceId);
        // const workplaceDescription = req.body.WorkPlace;
        const approvalDate = req.body.ApprovalDate;
        const withdrawn = req.body.Withdrawn;
        let workplaceDescription = '';

        if (workplaceId) {
            const workplace = await Workplace.findOne({ id: workplaceId.toString() });
            if (workplace) {
                workplaceDescription = workplace.description;
            }
        }
        const sanitizedPurchase = {
            amount: req.body.shareAmount,
            initialAmount: req.body.shareInitialPrice,
            currentAmount: Number(req.body.shareInitialPrice),
            date: new Date(),
            lastUpdateDate: new Date(),
        };

        const sanitizedShare = {
            purchases: [sanitizedPurchase],
            totalAmount: Number(req.body.shareInitialPrice),
            shareIncrease: Number(req.body.profitShare),
            totalShareAmount: req.body.shareAmount,
            year: new Date().getFullYear(),
            withdrawn: false,
        };

        const share = await Share.create(sanitizedShare);
        console.log(req.body.Amanat)
        const amanat = req.body.Amanat;
        let newAmanat;
        console.log("This is the Amanat", amanat)
        const amanatDocument = {
            amount: amanat || 0,
            withdrawn: false,
            date: new Date(),
            year: new Date().getFullYear(),
        };
        newAmanat = await Amanat.create(amanatDocument);


        const sanitizedDeposit = {
            initialAmount: req.body.savingsInitialPrice,
            currentAmount: Number(req.body.savingsInitialPrice),
            date: new Date(),
            lastUpdateDate: new Date(),
        };

        const sanitizedSavings = {
            deposits: [sanitizedDeposit],
            totalAmount: Number(req.body.savingsInitialPrice) + Number(req.body.profitSaving),
            savingsIncrease: Number(req.body.profitSaving),
            withdrawn: withdrawn,
            maxReached: false,
            amanat: newAmanat,
            year: new Date().getFullYear(),
        };

        const savings = await Saving.create(sanitizedSavings);
        const adminId = (req.body.adminId);

        const adminIdWithTimestamp = adminId.map(admin => ({
            ...admin,
            timestamp: new Date()
        }));
        const adminIdWithOutTimestamp = adminId[0]?.admin
        console.log(req.body.fName)
        const sanitizedShareholder = {
            fName: req.body.fName,
            arabFName: sanitizeInput(req.body.arabFName),
            lName: sanitizeInput(req.body.lName),
            arabLName: sanitizeInput(req.body.arabLName),
            fullName: sanitizeInput(req.body.fullName),
            membersCode: req.body.membersCode || undefined,
            DOB: sanitizeInput(req.body.dob),
            civilId: sanitizeInput(req.body.civilId.replace(/`/g, '')), // Strip the apostrophe
            ibanNumber: sanitizeInput(req.body.ibanNumber),
            mobileNumber: sanitizeInput(req.body.mobileNumber),
            gender: sanitizeInput(req.body.gender),
            workplace: workplaceDescription,
            withdrawn: false,
            status: 0,
            membershipStatus: 0,
            dateOfDeath: null,
            resignationDate: null,
            createdByAdmin: adminIdWithOutTimestamp,
            workplace: workplaceDescription,
            email: sanitizeInput(req.body.email),
            poBox: sanitizeInput(req.body.poBox),
            zipCode: sanitizeInput(req.body.zipCode),
            Area: sanitizeInput(req.body.area),
            Country: "كويت",
            joinDate: sanitizeInput(req.body.joinDate),
            address: address?._id,
            share: share?._id,
            savings: savings?._id
        };

        const shareholder = await Shareholder.create(sanitizedShareholder);

        // Handle transactions
        const depositAmount = req.body.depositAmount;
        const depositDate = req.body.depositDate;
        const withdrawAmount = req.body.withdrawAmount;
        const withdrawDate = req.body.withdrawalDate;
        const deposit = req.body.Deposit;
        const withdraw = req.body.Withdraw;
        console.log(typeof (deposit))
        console.log("Withdraw: ", withdraw)
        console.log("Deposit: ", deposit)
        console.log("Deposit Date: ", depositDate)
        console.log("Withdraw Date: ", withdrawDate)
        if (deposit == "TRUE" || depositAmount || depositDate) {
            const sanitizedDeposit = {
                initialAmount: depositAmount,
                currentAmount: depositAmount,
                date: new Date(depositDate),
                lastUpdateDate: new Date(depositDate),
            };

            savings.deposits.push(sanitizedDeposit);
            savings.totalAmount += depositAmount;

            const depositSavings = {
                shareholder: shareholder?._id,
                savings: savings?._id,
                previousAmount: savings.totalAmount - depositAmount,
                newAmount: savings.totalAmount,
                type: "Savings",
                depositDate: new Date(depositDate),
            };
            await DepositHistory.create(depositSavings);
            console.log(depositSavings)

        }

        if (withdraw == "TRUE" || withdrawAmount || withdrawDate) {
            if (withdrawAmount > savings.totalAmount) {
                return res.status(400).send({ status: 2, message: "Insufficient funds to withdraw." });
            }

            let remainingAmountToWithdraw = withdrawAmount;

            for (let i = 0; i < savings.deposits.length; i++) {
                const deposit = savings.deposits[i];

                if (remainingAmountToWithdraw >= deposit.currentAmount) {
                    remainingAmountToWithdraw -= deposit.currentAmount;
                    deposit.currentAmount = 0;
                } else {
                    deposit.currentAmount -= remainingAmountToWithdraw;
                    remainingAmountToWithdraw = 0;
                }

                if (remainingAmountToWithdraw === 0) {
                    break;
                }
            }

            savings.totalAmount -= withdrawAmount;
            savings.withdrawn = savings.totalAmount === 0;

            const withdrawSavings = {
                shareholder: shareholder?._id,
                savings: savings._id,
                previousAmount: savings.totalAmount + withdrawAmount,
                newAmount: savings.totalAmount,
                type: "Savings",
                withdrawalDate: new Date(withdrawDate),
            };
            console.log(withdrawSavings)
            await WithdrawalHistory.create(withdrawSavings);
        }

        await savings.save();
        await share.save();
        await shareholder.save();

        res.status(201).send({ status: 0, message: "Shareholder Saved Successfully.", shareholder });
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message });
    }
};
// exports.createShareholderBackup = async (req, res) => {
//     try {
//         const sanitizedAddress = {
//             block: sanitizeInput(req.body.block),
//             street: sanitizeInput(req.body.street),
//             house: sanitizeInput(req.body.house),
//             avenue: sanitizeInput(req.body.avenue),
//             city: sanitizeInput(req.body.city),
//         }
//         const address = await Address.create(sanitizedAddress);
//         const shareAmount = sanitizeInput(req.body.shareAmount);
//         const shareInitialPrice = sanitizeInput(req.body.shareInitialPrice);
//         const workplaceId = sanitizeInput(req.body.workplaceId);
//         const profitSaving = req.body.profitSaving
//         const profitShare = req.body.profitShare

//         console.log("This is the membersCode", req.body.membersCode);
//         let workplaceDescription = '';

//         if (workplaceId) {
//             const workplace = await Workplace.findOne({ id: workplaceId.toString() });
//             if (workplace) {
//                 workplaceDescription = workplace.description;
//             }
//         }
//         const approvalDate = req.body.approvalDate;
//         const year = req.body.year;
//         const withdrawn = req.body.withdrawn;
//         console.log("This is the withdrawn ", withdrawn)
//         const sanitizedPurchase = {
//             amount: shareAmount,
//             initialAmount: shareInitialPrice,
//             currentAmount: Number(shareInitialPrice) + Number(profitShare),
//             date: new Date(approvalDate),
//             lastUpdateDate: new Date(approvalDate),
//         };

//         const sanitizedShare = {
//             purchases: [sanitizedPurchase],
//             totalAmount: Number(shareInitialPrice) + Number(profitShare),
//             totalShareAmount: shareAmount,
//             year: new Date(approvalDate).getFullYear(),
//             serial: req.body.serial,
//             adminId: adminIdWithTimestamp,
//             withdrawn: withdrawn,
//         };

//         const share = await Share.create(sanitizedShare);
//         const adminId = (req.body.adminId);

//         const adminIdWithTimestamp = adminId.map(admin => ({
//             ...admin,
//             timestamp: new Date()
//         }));
//         const adminIdWithOutTimestamp = adminId[0]?.admin
//         console.log("This is the adminId", adminIdWithOutTimestamp);
//         let amanatDocument;
//         if (req.body.amanat) {
//             amanatDocument = {
//                 amount: req.body.amanat,
//                 withdrawn: false,
//                 date: new Date(),
//                 year: new Date().getFullYear(),
//             };
//         }

//         let newAmanat;
//         if (amanatDocument) {
//             newAmanat = await Amanat.create(amanatDocument);
//         }
//         const sanitizedDeposit = {
//             initialAmount: sanitizeInput(req.body.savingsInitialPrice),
//             currentAmount: Number(req.body.savingsInitialPrice) + Number(profitSaving),
//             date: new Date(),
//             lastUpdateDate: new Date(),
//         };

//         const sanitizedSavings = {
//             deposits: [sanitizedDeposit],
//             totalAmount: Number(req.body.savingsInitialPrice) + Number(profitSaving),
//             withdrawn: withdrawn,
//             maxReached: false,
//             amanat: newAmanat,
//             year: new Date().getFullYear(),
//             adminId: adminIdWithTimestamp,
//         };

//         const savings = await Saving.create(sanitizedSavings);

//         const sanitizedShareholder = {
//             fName: sanitizeInput(req.body.fName),
//             arabFName: sanitizeInput(req.body.arabFName),
//             lName: sanitizeInput(req.body.lName),
//             arabLName: sanitizeInput(req.body.arabLName),
//             fullName: sanitizeInput(req.body.fullName),
//             membersCode: req.body.membersCode || undefined,
//             DOB: sanitizeInput(req.body.dob),
//             civilId: sanitizeInput(req.body.civilId),
//             ibanNumber: sanitizeInput(req.body.ibanNumber),
//             mobileNumber: sanitizeInput(req.body.mobileNumber),
//             gender: sanitizeInput(req.body.gender),
//             withdrawn: false,
//             status: 0,
//             membershipStatus: 0,
//             dateOfDeath: null,
//             resignationDate: null,
//             createdByAdmin: adminIdWithOutTimestamp,
//             workplace: workplaceDescription,
//             email: sanitizeInput(req.body.email),
//             poBox: sanitizeInput(req.body.poBox),
//             zipCode: sanitizeInput(req.body.zipCode),
//             Area: sanitizeInput(req.body.area),
//             Country: "كويت",
//             joinDate: sanitizeInput(req.body.joinDate),
//             address: address?._id,
//             share: share?._id,
//             savings: savings?._id
//         };
//         console.log(sanitizedShareholder);
//         const depositSavings = {
//             shareholder: id,
//             savings: updatedSavings._id,
//             previousAmount: updatedSavings.deposits.reduce((total, deposit) => total + deposit.initialAmount, 0) - initialAmount,
//             newAmount: updatedSavings.deposits.reduce((total, deposit) => total + deposit.initialAmount, 0),
//             admin: adminId,
//             type: "Savings",
//             depositDate: new Date(),
//         };
//         await DepositHistory.create(depositSavings);
//         const shareholder = await Shareholder.create(sanitizedShareholder);
//         res.status(201).send({ status: 0, message: "Shareholder Saved Successfully.", shareholder })
//     } catch (err) {
//         res.status(400).send({ status: 1, message: err.message })
//     }
// }
exports.addShareholderSavingsForBackup = async (req, res) => {
    try {
        const membersCode = req.body.MemberCode;
        console.log(membersCode);
        const initialAmount = req.body.Saving;
        const currentAmount = req.body.Saving;
        const adminId = req.body.adminId;
        const adminIdWithTimestamp = adminId.map(admin => ({ ...admin, timestamp: new Date() }));

        // Find the shareholder based on the membersCode
        const shareholder = await Shareholder.findOne({ membersCode: membersCode });

        if (!shareholder) {
            return res.status(404).send({ status: 1, message: "Shareholder not found" });
        }

        // Get the joinDate from the shareholder document
        const joinDate = shareholder.joinDate;

        // Sanitize savings data
        const sanitizedSavings = {
            initialAmount: initialAmount,
            currentAmount: currentAmount,
            withdrawn: false,
            adminId: adminIdWithTimestamp,
            date: joinDate,
            year: joinDate.getFullYear(),
        };

        // Create a new savings document
        const savings = await Saving.create(sanitizedSavings);

        // Update the shareholder's savings reference
        shareholder.savings = savings._id;

        // Save the updated shareholder
        await shareholder.save();

        res.status(200).send({
            status: 0,
            message: "Savings added to shareholder successfully",
            shareholder,
        });
    } catch (err) {
        res.status(400).send({ status: 1, message: err.message });
    }
};
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
        shareholder.quitDate = req.body.quitDate ? new Date(req.body.quitDate) : shareholder.quitDate;
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
        // Retrieve and parse input values
        const id = req.params.id;
        const initialAmount = parseFloat(req.body.newAmount);
        const adminId = req.body.adminId;
        const year = req.body.year;
        const date = new Date(req.body.date);

        // Check if the parsed values are valid
        if (isNaN(initialAmount) || !adminId || isNaN(year)) {
            return res.status(400).send({ message: "Invalid input data." });
        }

        // Find the shareholder
        const shareholder = await Shareholder.findById(id);
        if (!shareholder) {
            return res.status(404).send({ message: "Shareholder not found." });
        }

        // Calculate current total savings
        let currentTotalSavings = 0;
        if (shareholder.savings && shareholder.savings._id) {
            const savings = await Saving.findById(shareholder.savings._id);
            if (savings) {
                currentTotalSavings = savings.totalAmount;
            }
        }

        // Check if new total savings would exceed 1000
        if (currentTotalSavings + initialAmount > 1000) {
            return res.status(400).send({ status: 2, message: "Total Savings cannot be larger than 1000", messageArabic: "لا يمكن أن يكون إجمالي المدخرات أكبر من 1000" });
        }

        let updatedSavings;
        if (!shareholder.savings || !shareholder.savings._id) {
            // If no existing savings are linked, create new savings data
            updatedSavings = await Saving.create({
                deposits: [
                    {
                        initialAmount,
                        currentAmount: initialAmount,
                        date: date,
                        lastUpdateDate: date,
                    },
                ],
                adminId: [
                    {
                        adminId,
                        amountBeforeChange: 0,
                        timestamp: date,
                    },
                ],
                withdrawn: false,
                year,
                alraseed: initialAmount
            });

            // Link the new savings to the shareholder
            shareholder.savings = updatedSavings._id;
        } else {
            // Find the current savings before update
            const currentSavings = await Saving.findById(shareholder.savings._id);
            const oldTotalAmount = currentSavings ? currentSavings.totalAmount : 0;

            // Update the existing savings
            updatedSavings = await Saving.findByIdAndUpdate(
                shareholder.savings._id,
                {
                    $push: {
                        deposits: {
                            initialAmount,
                            currentAmount: initialAmount,
                            date: date,
                            lastUpdateDate: date,
                        },
                        adminId: {
                            adminId,
                            amountBeforeChange: oldTotalAmount,
                            timestamp: date,
                        },
                    },
                    $inc: { totalAmount: initialAmount }
                },
                { new: true }
            );
        }

        // Save the updated shareholder record
        shareholder.savings = updatedSavings._id;
        await shareholder.save();

        // Create a new deposit history record
        const depositSavings = {
            shareholder: id,
            savings: updatedSavings._id,
            previousAmount: updatedSavings.totalAmount - initialAmount,
            newAmount: updatedSavings.totalAmount,
            admin: adminId,
            type: "Savings",
            depositDate: date,
        };
        await DepositHistory.create(depositSavings);

        res.status(200).send({
            message: "Savings updated successfully.",
            savings: updatedSavings,
            shareholder,
        });
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Internal server error." });
    }
}

exports.addSharesToShareholder = async (req, res) => {
    try {
        const id = req.params.id;
        const newShareAmount = Number(req.body.newShareAmount);
        const adminId = req.body.adminId;
        const year = req.body.year || new Date().getFullYear();
        const date = new Date(req.body.date);

        const shareholder = await Shareholder.findById(id).populate('share');

        if (!shareholder) {
            return res.status(404).send({ status: 404, message: "Shareholder not found.", messageArabic: "لم يتم العثور على المساهم." });
        }

        let share;
        if (shareholder.share) {
            share = shareholder.share;
        } else {
            share = await Share.create({
                purchases: [],
                totalAmount: 0,
                totalShareAmount: 0,
                adminId: [],
                year: year,
            });
            shareholder.share = share._id;
            await shareholder.save();
        }

        const oldTotalShareAmount = share.totalShareAmount;
        const newTotalShareAmount = oldTotalShareAmount + newShareAmount;

        // Check if new total share amount would exceed 300
        if (newTotalShareAmount > 300) {
            return res.status(400).send({
                status: 2,
                message: "Total Share Amount cannot be larger than 300",
                messageArabic: "لا يمكن أن يكون إجمالي مبلغ الأسهم أكبر من 300"
            });
        }

        const oldTotalAmount = share.totalAmount;
        const purchaseAmount = newShareAmount * 2;

        share.purchases.push({
            amount: newShareAmount,
            initialAmount: purchaseAmount,
            currentAmount: purchaseAmount,
            date: date,
            lastUpdateDate: date,
        });

        share.totalAmount += purchaseAmount;
        share.totalShareAmount = newTotalShareAmount;
        share.adminId.push({
            adminId: adminId,
            amountBeforeChange: oldTotalAmount,
            shareAmountBeforeChange: oldTotalShareAmount,
            timestamp: date,
        });

        await share.save();

        const depositShare = {
            shareholder: id,
            shares: share._id,
            previousAmount: oldTotalAmount,
            newAmount: share.totalAmount,
            previousShareAmount: oldTotalShareAmount,
            newShareAmount: share.totalShareAmount,
            admin: adminId,
            type: "Shares",
            depositDate: date,
            year: year,
        };

        await DepositHistory.create(depositShare);

        res.status(200).send({
            status: 200,
            message: "Shares updated successfully.",
            messageArabic: "تم تحديث الأسهم بنجاح.",
            share: share,
        });
    } catch (err) {
        res.status(400).send({ status: 400, message: err.message, messageArabic: "حدث خطأ أثناء تحديث الأسهم." });
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
exports.moveSavingsToAmanat = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        const amountToMove = Number(req.body.amountToMove);
        const year = new Date().getFullYear().toString();
        const date = new Date(req.body.date);

        const shareholder = await Shareholder.findById(id).populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        }).populate('share');

        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        if (!shareholder.savings) {
            return res.status(404).send({ status: 1, message: 'Shareholder has no savings' });
        }

        const savings = shareholder.savings;
        const share = shareholder.share;

        // Calculate total available increase
        const totalIncrease = savings.savingsIncrease + share.shareIncrease;

        // Check if there's enough balance in total increase to move
        if (amountToMove > totalIncrease) {
            return res.status(400).send({ status: 2, message: "Insufficient funds in total increase to move." });
        }

        // Update the savingsIncrease and shareIncrease
        let remainingToSubtract = amountToMove;

        if (remainingToSubtract <= savings.savingsIncrease) {
            savings.savingsIncrease -= remainingToSubtract;
            remainingToSubtract = 0;
        } else {
            remainingToSubtract -= savings.savingsIncrease;
            savings.savingsIncrease = 0;
            share.shareIncrease -= remainingToSubtract;
        }

        await savings.save();
        await share.save();

        // Create or update Amanat
        let amanat = savings.amanat;
        if (!amanat) {
            amanat = new Amanat({
                amount: amountToMove,
                withdrawn: false,
                date: date,
                year: year
            });
        } else {
            amanat.amount += amountToMove;
            amanat.year = year;
        }
        await amanat.save();

        // Update the shareholder's amanat reference
        shareholder.savings.amanat = amanat._id;
        shareholder.lastEditedBy.push(userId);
        await shareholder.save();

        // Create a transfer log
        const transferLog = new TransferLog({
            shareholder: shareholder._id,
            fromSavings: savings._id,
            toAmanat: amanat._id,
            amount: amountToMove,
            date: date,
            admin: userId
        });
        await transferLog.save();

        const response = {
            shareholder: shareholder,
            savings: savings,
            share: share,
            amanat: amanat,
            amountMoved: amountToMove
        };

        res.status(200).send({
            status: 0,
            response,
            message: `${shareholder.fName} ${shareholder.lName} has moved ${amountToMove} from their Total Increase to Amanat.`
        });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.moveCurrentSavingsToAmanat = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        const amountToMove = Number(req.body.amountToMove);
        const year = new Date().getFullYear().toString();
        const date = new Date(req.body.date);

        const shareholder = await Shareholder.findById(id).populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        }).populate('share');

        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        if (!shareholder.savings) {
            return res.status(404).send({ status: 1, message: 'Shareholder has no savings' });
        }

        const savings = shareholder.savings;
        const share = shareholder.share;

        // Calculate total available increase
        const totalIncrease = savings.totalAmount

        // Check if there's enough balance in total increase to move
        if (amountToMove > totalIncrease) {
            return res.status(400).send({ status: 2, message: "Insufficient funds in total increase to move." });
        }

        // Update the savingsIncrease and shareIncrease
        let remainingToSubtract = amountToMove;

        if (remainingToSubtract <= savings.totalAmount) {
            savings.totalAmount -= remainingToSubtract;
            remainingToSubtract = 0;
        } else {
            remainingToSubtract -= savings.totalAmount;
            savings.totalAmount = 0;

        }

        await savings.save();

        // Create or update Amanat
        let amanat = savings.amanat;
        if (!amanat) {
            amanat = new Amanat({
                amount: amountToMove,
                withdrawn: false,
                date: date,
                year: year
            });
        } else {
            amanat.amount += amountToMove;
            amanat.year = year;
        }
        await amanat.save();

        // Update the shareholder's amanat reference
        shareholder.savings.amanat = amanat._id;
        shareholder.lastEditedBy.push(userId);
        await shareholder.save();

        // Create a transfer log
        const transferLog = new TransferLog({
            shareholder: shareholder._id,
            fromSavings: savings._id,
            toAmanat: amanat._id,
            amount: amountToMove,
            date: date,
            admin: userId
        });
        await transferLog.save();

        const response = {
            shareholder: shareholder,
            savings: savings,
            share: share,
            amanat: amanat,
            amountMoved: amountToMove
        };

        res.status(200).send({
            status: 0,
            response,
            message: `${shareholder.fName} ${shareholder.lName} has moved ${amountToMove} from their Total Amount to Amanat.`
        });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.transferSpecificInterestToSavings = async (req, res) => {
    try {
        const { membersCode, userId, amountToTransfer } = req.body;

        if (!amountToTransfer || isNaN(amountToTransfer) || amountToTransfer <= 0) {
            return res.status(400).send({ status: 1, message: 'Invalid amount to transfer' });
        }

        // Find the shareholder by membersCode
        const shareholder = await Shareholder.findOne({ membersCode }).populate('savings').populate('share');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        let savings = shareholder.savings;
        let share = shareholder.share;

        // Calculate total available interest
        const totalInterest = savings.savingsIncrease + share.shareIncrease;

        if (amountToTransfer > totalInterest) {
            return res.status(400).send({ status: 1, message: 'Insufficient interest available for transfer' });
        }

        const date = new Date();
        let amountToSavings = 0;
        let amountToAmanat = 0;

        // Determine how much goes to savings and how much to amanat
        if (savings.totalAmount + amountToTransfer <= 1000) {
            amountToSavings = amountToTransfer;
        } else {
            amountToSavings = 1000 - savings.totalAmount;
            amountToAmanat = amountToTransfer - amountToSavings;
        }

        // Update savings
        savings.totalAmount += amountToSavings;

        // Subtract transferred amount from interest
        let remainingToSubtract = amountToTransfer;
        if (remainingToSubtract <= savings.savingsIncrease) {
            savings.savingsIncrease -= remainingToSubtract;
            remainingToSubtract = 0;
        } else {
            remainingToSubtract -= savings.savingsIncrease;
            savings.savingsIncrease = 0;
            share.shareIncrease -= remainingToSubtract;
        }

        if (amountToSavings > 0) {
            const newDeposit = {
                initialAmount: amountToSavings,
                currentAmount: amountToSavings,
                date: date,
                lastUpdateDate: date
            };
            savings.deposits.push(newDeposit);

            // Create a deposit log
            await TransferLog.create({
                shareholder: shareholder._id,
                fromSavings: savings._id,
                amount: amountToSavings,
                date: date,
                admin: userId,
                transferType: "Specific Interest to Savings"
            });
        }

        // Handle amanat if necessary
        let amanatDetails = null;
        if (amountToAmanat > 0) {
            amanatDetails = await handleAmanat(shareholder, savings, amountToAmanat, userId, date);
        }

        await savings.save();
        await share.save();

        // Update shareholder's lastEditedBy
        shareholder.lastEditedBy.push(userId);
        await shareholder.save();

        // Prepare response
        const response = {
            shareholder: shareholder,
            savings: savings,
            share: share,
            amountAddedToSavings: amountToSavings,
            amountAddedToAmanat: amountToAmanat,
            amanatDetails: amanatDetails,
            remainingInterest: savings.savingsIncrease + share.shareIncrease
        };

        let message = `${shareholder.fName} ${shareholder.lName}'s interest of ${amountToTransfer} has been transferred: ${amountToSavings} to Savings`;
        if (amountToAmanat > 0) {
            message += ` and ${amountToAmanat} to Amanat.`;
        }
        message += ` Remaining interest: ${response.remainingInterest}`;

        res.status(200).send({
            status: 0,
            response,
            message
        });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.transferInterestToSavings = async (req, res) => {
    try {
        const { membersCode, userId } = req.body;

        // Find the shareholder by membersCode
        const shareholder = await Shareholder.findOne({ membersCode }).populate('savings').populate('share');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        let savings = shareholder.savings;
        let share = shareholder.share;

        // Calculate total available interest
        const totalInterest = savings.savingsIncrease + share.shareIncrease;

        if (totalInterest <= 0) {
            return res.status(400).send({ status: 1, message: 'No interest available to transfer' });
        }

        const date = new Date();
        let amountToSavings = 0;
        let amountToAmanat = 0;

        // Determine how much goes to savings and how much to amanat
        if (savings.totalAmount + totalInterest <= 1000) {
            amountToSavings = totalInterest;
        } else {
            amountToSavings = 1000 - savings.totalAmount;
            amountToAmanat = totalInterest - amountToSavings;
        }

        // Update savings
        savings.totalAmount += amountToSavings;

        // Reset interest amounts
        savings.savingsIncrease = 0;
        share.shareIncrease = 0;

        if (amountToSavings > 0) {
            const newDeposit = {
                initialAmount: amountToSavings,
                currentAmount: amountToSavings,
                date: date,
                lastUpdateDate: date
            };
            savings.deposits.push(newDeposit);

            // Create a deposit log
            await TransferLog.create({
                shareholder: shareholder._id,
                fromSavings: savings._id,
                amount: amountToSavings,
                date: date,
                admin: userId,
                transferType: "Savings"
            });
        }

        // Handle amanat if necessary
        let amanatDetails = null;
        if (amountToAmanat > 0) {
            amanatDetails = await handleAmanat(shareholder, savings, amountToAmanat, userId, date);
        }

        await savings.save();
        await share.save();

        // Update shareholder's lastEditedBy
        shareholder.lastEditedBy.push(userId);
        await shareholder.save();

        // Prepare response
        const response = {
            shareholder: shareholder,
            savings: savings,
            share: share,
            amountAddedToSavings: amountToSavings,
            amountAddedToAmanat: amountToAmanat,
            amanatDetails: amanatDetails
        };

        let message = `${shareholder.fName} ${shareholder.lName}'s interest of ${totalInterest} has been transferred: ${amountToSavings} to Savings`;
        if (amountToAmanat > 0) {
            message += ` and ${amountToAmanat} to Amanat.`;
        }

        res.status(200).send({
            status: 0,
            response,
            message
        });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.addToSavings = async (req, res) => {
    try {
        const shareholderId = req.params.id;
        console.log(shareholderId)
        const adminId = req.body.userId;
        const amountToWithdraw = Number(req.body.amountToWithdraw);
        const date = new Date(req.body.date);

        const shareholder = await Shareholder.findById(shareholderId).populate('savings').populate('share');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        if (!shareholder.savings) {
            return res.status(404).send({ status: 1, message: 'Shareholder has no savings record' });
        }

        let savings = shareholder.savings;
        let share = shareholder.share;

        // Calculate total available increase
        const totalIncrease = savings.savingsIncrease + share.shareIncrease;

        // Check if amountToWithdraw is not more than total increase
        if (amountToWithdraw > totalIncrease) {
            return res.status(400).send({ status: 1, message: 'Amount to withdraw exceeds available increase' });
        }

        console.log("Current savings total amount:", savings.totalAmount);
        console.log("Amount to add:", amountToWithdraw);
        let amountToSavings = 0;
        let amountToAmanat = 0;

        // Determine how much goes to savings and how much to amanat
        if (savings.totalAmount + amountToWithdraw <= 1000) {
            amountToSavings = amountToWithdraw;
        } else {
            amountToSavings = 1000 - savings.totalAmount;
            amountToAmanat = amountToWithdraw - amountToSavings;
        }

        console.log("Amount to savings:", amountToSavings);
        console.log("Amount to amanat:", amountToAmanat);

        // Update savings
        savings.totalAmount += amountToSavings;
        console.log("Savings total amount after adding:", savings.totalAmount);

        // Subtract amountToWithdraw from savingsIncrease and shareIncrease
        let remainingToSubtract = amountToWithdraw;

        if (remainingToSubtract <= savings.savingsIncrease) {
            savings.savingsIncrease -= remainingToSubtract;
            remainingToSubtract = 0;
        } else {
            remainingToSubtract -= savings.savingsIncrease;
            savings.savingsIncrease = 0;
            share.shareIncrease -= remainingToSubtract;
        }

        console.log("Savings increase after subtraction:", savings.savingsIncrease);
        console.log("Share increase after subtraction:", share.shareIncrease);

        if (amountToSavings > 0) {
            const newDeposit = {
                initialAmount: amountToSavings,
                currentAmount: amountToSavings,
                date: date,
                lastUpdateDate: date
            };
            savings.deposits.push(newDeposit);

            // Create a deposit log
            await TransferLog.create({
                shareholder: shareholder._id,
                fromSavings: savings._id,
                amount: amountToSavings,
                date: date,
                admin: adminId,
                transferType: "Savings"
            });
        }

        // Handle amanat if necessary
        let amanatDetails = null;
        if (amountToAmanat > 0) {
            amanatDetails = await handleAmanat(shareholder, savings, amountToAmanat, adminId, date);
        }

        await savings.save();
        await share.save();

        // Update shareholder's lastEditedBy
        shareholder.lastEditedBy.push(adminId);
        await shareholder.save();

        // Prepare response
        const response = {
            shareholder: shareholder,
            savings: savings,
            share: share,
            amountAddedToSavings: amountToSavings,
            amountAddedToAmanat: amountToAmanat,
            amanatDetails: amanatDetails
        };

        let message = `${shareholder.fName} ${shareholder.lName} has added ${amountToSavings} to their Savings.`;
        if (amountToAmanat > 0) {
            message += ` ${amountToAmanat} has been moved to Amanat as it exceeds the 1000 limit.`;
        }

        res.status(200).send({
            status: 0,
            response,
            message
        });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.forceApplyIncrement = async (req, res) => {
    try {
        const shareholderId = req.params.id;
        const adminId = req.body.userId;

        const shareholder = await Shareholder.findById(shareholderId).populate('savings').populate('share');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        if (!shareholder.savings) {
            return res.status(404).send({ status: 1, message: 'Shareholder has no savings record' });
        }

        let savings = shareholder.savings;
        let share = shareholder.share;

        // Force calculate current price (which applies the increment)
        const incrementAmount = await savings.calculateCurrentPrice();

        // Set withdrawn to true
        savings.withdrawn = true;

        // Update total amount and savingsIncrease
        // savings.totalAmount += incrementAmount;
        savings.savingsIncrease += incrementAmount;

        await savings.save();
        await share.save();

        // Update shareholder's lastEditedBy
        shareholder.lastEditedBy.push(adminId);
        await shareholder.save();

        // Prepare response
        const response = {
            shareholder: shareholder,
            savings: savings,
            share: share,
            incrementAmount: incrementAmount
        };

        const message = `Forced increment of ${incrementAmount} applied to ${shareholder.fName} ${shareholder.lName}'s savings. Withdrawn status set to true. Total savings increase is now ${savings.savingsIncrease}.`;

        res.status(200).send({
            status: 0,
            response,
            message
        });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.calculatePotentialIncrement = async (req, res) => {
    try {
        const shareholderId = req.params.id;

        const shareholder = await Shareholder.findById(shareholderId).populate('savings').populate('share');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        if (!shareholder.savings) {
            return res.status(404).send({ status: 1, message: 'Shareholder has no savings record' });
        }

        let savings = shareholder.savings;
        let share = shareholder.share;

        let potentialIncrementAmount;
        let potentialTotalAmount;
        let potentialSavingsIncrease;

        if (savings.withdrawn) {
            // If savings are already withdrawn, use the current amount
            potentialIncrementAmount = 0;
            potentialTotalAmount = savings.totalAmount;
            potentialSavingsIncrease = savings.savingsIncrease;
        } else {
            // Calculate potential increment amount
            potentialIncrementAmount = await savings.calculateCurrentPrice();
            potentialTotalAmount = savings.totalAmount + potentialIncrementAmount;
            potentialSavingsIncrease = savings.savingsIncrease + potentialIncrementAmount;
        }

        // Prepare response
        const response = {
            shareholder: {
                id: shareholder._id,
                fName: shareholder.fName,
                lName: shareholder.lName
            },
            currentValues: {
                totalAmount: savings.totalAmount,
                savingsIncrease: savings.savingsIncrease,
                withdrawn: savings.withdrawn
            },
            potentialValues: {
                totalAmount: savings.totalAmount,
                savingsIncrease: potentialSavingsIncrease,
                withdrawn: true
            },
            potentialIncrementAmount: potentialIncrementAmount
        };

        let message;
        if (savings.withdrawn) {
            message = `Savings for ${shareholder.fName} ${shareholder.lName} are already withdrawn. No additional increment is applicable.`;
        } else {
            message = `Calculated potential increment of ${potentialIncrementAmount} for ${shareholder.fName} ${shareholder.lName}'s savings. No changes have been applied to the database.`;
        }

        res.status(200).send({
            status: 0,
            response,
            message
        });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
async function handleAmanat(shareholder, savings, amountToMove, adminId, date) {
    const year = new Date().getFullYear().toString();

    let amanat;
    if (savings.amanat) {
        amanat = await Amanat.findById(savings.amanat);
    }

    if (!amanat) {
        amanat = new Amanat({
            amount: amountToMove,
            withdrawn: false,
            date: date,
            year: year
        });
    } else {
        amanat.amount += amountToMove;
        amanat.year = year;
    }

    await amanat.save();

    savings.amanat = amanat._id;

    // Create a transfer log
    await TransferLog.create({
        shareholder: shareholder._id,
        fromSavings: savings._id,
        toAmanat: amanat._id,
        amount: amountToMove,
        date: date,
        transferType: "Amanat",
        admin: adminId
    });

    return {
        amanat: amanat,
        amountMoved: amountToMove
    };
}
exports.withdrawAmanat = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        const amountToWithdraw = req.body.amountToWithdraw;
        const date = new Date(req.body.date);

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
        // if (shareholder.savings.amanat && shareholder.savings.amanat.withdrawn) {
        //     const response = {
        //         shareholder: shareholder,
        //         savings: shareholder.savings.amanat,
        //         link: `/printsavingswithdrawal/${shareholder.id}`
        //     };
        //     return res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName}'s savings have already been withdrawn.` });
        // }
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
            withdrawalDate: date
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
        const date = new Date(req.body.date);

        const amountToWithdraw = req.body.amountToWithdraw;
        console.log(id)
        const shareholder = await Shareholder.findById(id).populate('savings');
        console.log(shareholder)
        console.log(shareholder.savings);

        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        if (!shareholder.savings) {
            return res.status(404).send({ status: 1, message: 'Shareholder has no savings' });
        }

        const savings = shareholder.savings;
        const oldTotalAmount = savings.totalAmount;

        // // Check if savings have already been withdrawn
        // if (savings.withdrawn) {
        //     const response = {
        //         shareholder: shareholder,
        //         savings: savings,
        //         link: `/printsavingswithdrawal/${shareholder.id}`
        //     };
        //     return res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName}'s savings have already been withdrawn.` });
        // }

        // Check if there's enough balance to withdraw
        if (amountToWithdraw > savings.totalAmount) {
            return res.status(400).send({ status: 2, message: "Insufficient funds to withdraw." });
        }

        let remainingAmountToWithdraw = amountToWithdraw;

        // Iterate through the deposits and update the currentAmount
        for (let i = 0; i < savings.deposits.length; i++) {
            const deposit = savings.deposits[i];

            if (remainingAmountToWithdraw >= deposit.currentAmount) {
                remainingAmountToWithdraw -= deposit.currentAmount;
                deposit.currentAmount = 0;
            } else {
                deposit.currentAmount -= remainingAmountToWithdraw;
                remainingAmountToWithdraw = 0;
            }

            if (remainingAmountToWithdraw === 0) {
                break;
            }
        }

        // Update the totalAmount and withdrawn flag
        savings.totalAmount -= amountToWithdraw;
        savings.withdrawn = savings.totalAmount === 0;
        savings.year = year;

        await savings.save();

        shareholder.lastEditedBy.push(adminId);
        await shareholder.save();

        const withdrawalLog = new WithdrawalLog({
            shareholder: shareholder._id,
            saving: savings._id,
            link: `/printsavingswithdrawal/${shareholder.id}`
        });

        await withdrawalLog.save();

        const response = {
            shareholder: shareholder,
            savings: savings,
            link: `/printsavingswithdrawal/${shareholder.id}`
        };

        const WithdrawSavings = {
            shareholder: id,
            savings: savings._id,
            previousAmount: oldTotalAmount,
            newAmount: savings.totalAmount,
            admin: adminId,
            type: "Savings",
            withdrawalDate: date
        };

        const updatedupdatedHistory = await WithdrawalHistory.create([WithdrawSavings]);

        res.status(200).send({ status: 0, response, message: `${shareholder.fName} ${shareholder.lName} has withdrawn ${amountToWithdraw} from their Savings.` });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.combinedSavingsWithdrawal = async (req, res) => {
    try {
        const shareholderId = req.params.id;
        const adminId = req.body.adminId;
        const date = new Date(req.body.date);
        const year = date.getFullYear();

        const shareholder = await Shareholder.findById(shareholderId).populate('savings').populate('share');
        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }

        if (!shareholder.savings) {
            return res.status(404).send({ status: 1, message: 'Shareholder has no savings record' });
        }

        let savings = shareholder.savings;
        let share = shareholder.share;

        // Calculate potential increment
        let incrementAmount = 0;
        if (!savings.withdrawn) {
            incrementAmount = await savings.calculateCurrentPrice();
            savings.totalAmount += incrementAmount;
            savings.savingsIncrease += incrementAmount;
        }

        const totalAmountToWithdraw = savings.totalAmount;

        // Perform full withdrawal
        savings.deposits.forEach(deposit => {
            deposit.currentAmount = 0;
        });

        // Update savings
        savings.totalAmount = 0;
        savings.withdrawn = true;
        savings.year = year;
        await savings.save();

        // Update shareholder
        shareholder.lastEditedBy.push(adminId);
        shareholder.status = 1;
        shareholder.membershipStatus = 1;
        shareholder.quitDate = new Date()
        await shareholder.save();

        // Create withdrawal log
        const withdrawalLog = new WithdrawalLog({
            shareholder: shareholder._id,
            saving: savings._id,
            link: `/printsavingswithdrawal/${shareholder.id}`
        });
        await withdrawalLog.save();

        // Create withdrawal history
        const withdrawalHistory = new WithdrawalHistory({
            shareholder: shareholderId,
            savings: savings._id,
            previousAmount: totalAmountToWithdraw,
            newAmount: 0,
            admin: adminId,
            type: "Savings",
            withdrawalDate: date
        });
        await withdrawalHistory.save();

        // Prepare response
        const response = {
            shareholder: shareholder,
            savings: savings,
            share: share,
            incrementAmount: incrementAmount,
            withdrawnAmount: totalAmountToWithdraw,
            link: `/printsavingswithdrawal/${shareholder.id}`
        };

        const message = `Applied increment of ${incrementAmount}. ${shareholder.fName} ${shareholder.lName} has withdrawn their full savings amount of ${totalAmountToWithdraw}. New total amount: 0. Shareholder status and membership status updated to 1.`;

        res.status(200).send({
            status: 0,
            response,
            message
        });

    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};
exports.getShareholderFinancials = async (req, res) => {
    try {
        const id = req.params.id;
        // const year = parseInt(req.query.year, 10); // Parse year to an integer.
        // const year = req.query.year;

        // if (isNaN(year)) {
        //     return res.status(400).json({
        //         status: 1,
        //         message: "Invalid year provided."
        //     });
        // }

        const shareholder = await Shareholder.findOne({ _id: id })
            .populate({
                path: 'savings',
                populate: {
                    path: 'amanat',
                    model: 'Amanat'
                }
            })
            .populate('share');

        console.log(shareholder)
        if (!shareholder) {
            return res.status(404).json({
                status: 1,
                message: "Shareholder not found.",
            });
        }

        // Get the savings data for the given year.
        const savings = shareholder.savings ? shareholder.savings.totalAmount : null;
        const savingsIncrease = shareholder.savings ? shareholder.savings.savingsIncrease : null;
        // console.log(savings)
        // Find the specific share data for the given year.
        const share = shareholder.share ? shareholder.share.totalShareAmount : null;
        const shareValue = shareholder.share ? shareholder.share.totalAmount : null;
        const shareIncrease = shareholder.share ? shareholder.share.shareIncrease : null
        const totalInterest = Number(shareIncrease) + Number(savingsIncrease)
        const alraseed = shareholder.savings ? shareholder.savings.alraseed : null
        console.log(shareholder.savings.amanat)
        // Prepare the response.
        const response = {
            savings: savings,
            sharesTotalAmount: share || null,
            shareValue: shareValue || null,
            amanat: shareholder.savings && shareholder.savings.amanat ? shareholder.savings.amanat.amount : null,
            savingsIncrease: savingsIncrease || null,
            shareIncrease: shareIncrease || null,
            totalInterest: totalInterest || null,
            alraseed: alraseed || null,
        };

        // Return the data to the client.
        res.status(200).json({
            status: 0,
            response: response,
            message: "The financials of the user have been sent",
        });
    } catch (err) {
        console.error("Error getting financials of this user: ", err);
        res.status(500).json({
            status: 1,
            message: "Error getting user: " + err.message
        });
    }
};

exports.getShareholderAmanatReportExport = async (req, res) => {
    try {
        const { status, membershipStatus, format } = req.query;
        let queryConditions = {};

        // Construct query conditions
        if (status) queryConditions.status = parseInt(status);
        if (membershipStatus) queryConditions.membershipStatus = parseInt(membershipStatus);

        // Retrieve all shareholders from the database with populated fields
        const shareholders = await Shareholder.find(queryConditions)
            .populate({
                path: 'savings',
                populate: { path: 'amanat', model: 'Amanat' }
            });

        // Prepare an array to store the shareholder report data
        const reportData = shareholders.map(shareholder => {
            return {
                membersCode: shareholder.membersCode,
                fullName: `${shareholder.fName} ${shareholder.lName}`,
                civilId: shareholder.civilId || 'N/A',
                mobileNumber: shareholder.mobileNumber || 'N/A',
                savingsIncrease: shareholder.savings.savingsIncrease || 0,
                amanatAmount: shareholder.savings && shareholder.savings.amanat ? shareholder.savings.amanat.amount : 0
            };
        });

        // Prepare the workbook and worksheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Shareholder Amanat Report');

        // Add headers
        worksheet.addRow([
            'رقم العضوية', 'الاسم', 'الرقم المدني', 'رقم الهاتف', 'فائدة المدخرات', 'أمانات'
        ]);

        // Add data rows
        reportData.forEach(record => {
            worksheet.addRow([
                record.membersCode,
                record.fullName,
                record.civilId,
                record.mobileNumber,
                record.savingsIncrease,
                record.amanatAmount
            ]);
        });

        // Set content type and disposition based on format
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=shareholder_amanat_report.csv');
            res.write('\uFEFF');  // UTF-8 BOM

            await workbook.csv.write(res);

        } else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=shareholder_amanat_report.xlsx');
            await workbook.xlsx.write(res);
        }
        res.write('\uFEFF');  // UTF-8 BOM

        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.withdrawShares = async (req, res) => {
    try {
        const id = req.params.id;
        const userId = req.body.userId;
        const amountOfShares = req.body.amountOfShares;
        const amountToWithdraw = req.body.amountToWithdraw;
        const date = new Date(req.body.date);

        console.log(req.body);

        const shareholder = await Shareholder.findById(id).populate('share');

        if (!shareholder) {
            return res.status(404).send({ status: 1, message: 'Shareholder not found' });
        }
        console.log(shareholder)
        // if (shareholder.share && shareholder.share.withdrawn) {
        //     const response = {
        //         shareholder: shareholder,
        //         share: shareholder.share,
        //         link: `/printsavingswithdrawal/${shareholder.id}`,
        //     };
        //     return res.status(200).send({
        //         status: 0,
        //         response,
        //         message: `${shareholder.fName} ${shareholder.lName}'s savings have already been withdrawn.`,
        //     });
        // }

        const oldTotalAmount = shareholder.share ? shareholder.share.totalAmount : 0;
        const oldTotalShareAmount = shareholder.share ? shareholder.share.totalShareAmount : 0;
        console.log(oldTotalAmount, oldTotalShareAmount)
        if (shareholder.share) {
            const share = shareholder.share;
            console.log(share)
            if (amountToWithdraw > share.totalAmount || amountOfShares > share.totalShareAmount) {
                return res.status(400).send({ status: 2, message: "Insufficient funds or shares to withdraw." });
            }

            let remainingAmountToWithdraw = amountToWithdraw;
            let remainingAmountOfShares = amountOfShares;

            for (let i = 0; i < share.purchases.length; i++) {
                const purchase = share.purchases[i];

                if (remainingAmountOfShares >= purchase.amount) {
                    remainingAmountOfShares -= purchase.amount;
                    remainingAmountToWithdraw -= purchase.currentAmount;
                    purchase.amount = 0;
                    purchase.currentAmount = 0;
                } else {
                    purchase.amount -= remainingAmountOfShares;
                    purchase.currentAmount -= (remainingAmountOfShares * purchase.currentAmount) / purchase.amount;
                    remainingAmountOfShares = 0;
                    remainingAmountToWithdraw = 0;
                }

                if (remainingAmountOfShares === 0 && remainingAmountToWithdraw === 0) {
                    break;
                }
            }

            share.totalAmount -= amountToWithdraw;
            share.totalShareAmount -= amountOfShares;
            share.withdrawn = share.totalAmount === 0 && share.totalShareAmount === 0;

            await share.save();
        }

        shareholder.lastEditedBy.push(userId);
        await shareholder.save();

        const response = {
            shareholder: shareholder,
            share: shareholder.share,
            link: `/printshareswithdrawal/${shareholder.id}`,
        };

        const WithdrawShares = {
            shareholder: id,
            shares: shareholder.share._id,
            previousAmount: oldTotalAmount,
            newAmount: shareholder.share.totalAmount,
            previousShareAmount: oldTotalShareAmount,
            newShareAmount: shareholder.share.totalShareAmount,
            admin: userId,
            type: "Shares",
            withdrawalDate: date,
        };

        const updatedWithdrawalHistory = await WithdrawalHistory.create([WithdrawShares]);

        res.status(200).send({
            status: 0,
            message: `${shareholder.fName} ${shareholder.lName} has withdrawn ${amountOfShares} shares worth ${amountToWithdraw} KWD.`,
            response,
        });
    } catch (err) {
        res.status(400).send({ status: 4, message: err.message });
    }
};

exports.getTransferLogReportExport = async (req, res) => {
    try {
        const { startDate, endDate, format } = req.query;
        let queryConditions = {};

        // Construct query conditions for date range
        if (startDate && endDate) {
            queryConditions.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Retrieve all transfer logs from the database with populated fields
        const transferLogs = await TransferLog.find(queryConditions)
            .populate('shareholder')
            .populate('fromSavings')
            .populate('toAmanat')
            .populate('admin');

        // Prepare an array to store the transfer log report data
        const reportData = transferLogs.map(log => {
            const savingsTotal = log.fromSavings ? log.fromSavings.totalAmount : 0;
            const amanatTotal = log.toAmanat ? log.toAmanat.amount : 0;

            return {
                membersCode: log.shareholder ? log.shareholder.membersCode : 'N/A',
                fullName: log.shareholder ? `${log.shareholder.fName} ${log.shareholder.lName}` : 'N/A',
                transferAmount: log.amount,
                transferDate: log.date,
                savingsTotalBeforeTransfer: savingsTotal + log.amount,
                savingsTotalAfterTransfer: savingsTotal,
                amanatTotalBeforeTransfer: amanatTotal - log.amount,
                amanatTotalAfterTransfer: amanatTotal,
                adminName: log.admin ? `${log.admin.fName} ${log.admin.lName}` : 'N/A'
            };
        });

        // Prepare the workbook and worksheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Transfer Log Report');

        // Add headers
        worksheet.addRow([
            'رقم العضوية', 'الاسم', 'قيمة التحويل', 'تاريخ التحويل',
            'إجمالي المدخرات قبل التحويل', 'إجمالي المدخرات بعد التحويل',
            'إجمالي الأمانات قبل التحويل', 'إجمالي الأمانات بعد التحويل',
            'اسم المدير'
        ]);

        // Add data rows
        reportData.forEach(record => {
            worksheet.addRow([
                record.membersCode,
                record.fullName,
                record.transferAmount,
                record.transferDate,
                record.savingsTotalBeforeTransfer,
                record.savingsTotalAfterTransfer,
                record.amanatTotalBeforeTransfer,
                record.amanatTotalAfterTransfer,
                record.adminName
            ]);
        });

        // Set content type and disposition based on format
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=transfer_log_report.csv');
            await workbook.csv.write(res);
        } else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=transfer_log_report.xlsx');
            await workbook.xlsx.write(res);
        }
        res.write('\uFEFF');  // UTF-8 BOM

        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateAllSavingsIncrease = async (req, res) => {
    try {
        // Fetch all savings records
        const allSavings = await Saving.find({}).populate('deposits');

        let updatedCount = 0;

        for (const savings of allSavings) {
            let savingsIncrease = 0;

            if (savings.deposits && savings.deposits.length > 0) {
                savings.deposits.forEach(deposit => {
                    savingsIncrease += deposit.currentAmount - deposit.initialAmount;
                });
            }

            // Update the savings record with the calculated savingsIncrease
            await Saving.findByIdAndUpdate(savings._id, { savingsIncrease });
            updatedCount++;
        }

        res.json({
            message: `Successfully updated savingsIncrease for ${updatedCount} savings records.`,
            updatedCount
        });
    } catch (error) {
        console.error('Error updating savingsIncrease:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};