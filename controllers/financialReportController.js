const Shareholder = require('../models/shareholderSchema');
const Address = require('../models/addressSchema');
const Share = require('../models/shareSchema');
const Amanat = require('../models/amanatSchema');
const Saving = require('../models/savingsSchema');
const WithdrawalLog = require('../models/withdrawalLogSchema')
const xss = require('xss');

exports.getAllShareholderReport = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        let queryConditions = {};
        if (req.query.status) {
            queryConditions['status'] = req.query.status;
        }
        if (req.query.fName) {
            queryConditions['fName'] = { $regex: req.query.fName, $options: 'i' };
        }
        if (req.query.civilId) {
            queryConditions['civilId'] = { $regex: `^${req.query.civilId}`, $options: 'i' };
        }
        if (req.query.membershipStatus) {
            queryConditions['membershipStatus'] = req.query.membershipStatus;
        }
        if (req.query.lName) {
            queryConditions['lName'] = { $regex: req.query.lName, $options: 'i' };
        }
        if (req.query.serial) {
            queryConditions['serial'] = parseInt(req.query.serial, 10);
        }
        if (req.query.gender) {
            queryConditions['gender'] = req.query.gender;
        }

        const shareholders = await Shareholder.aggregate([
            { $match: queryConditions },
            {
                $lookup: {
                    from: 'savings',
                    localField: 'savings',
                    foreignField: '_id',
                    as: 'savings',
                    pipeline: [
                        {
                            $lookup: {
                                from: 'amanats',
                                localField: 'amanat',
                                foreignField: '_id',
                                as: 'amanat',
                            },
                        },
                        { $unwind: '$amanat' },
                    ],
                },
            },
            {
                $lookup: {
                    from: 'shares',
                    localField: 'share',
                    foreignField: '_id',
                    as: 'share',
                },
            },
            { $unwind: '$savings' },
            { $unwind: '$share' },

            {
                $project: {
                    serial: 1,
                    civilId: 1,
                    fullName: { $concat: ['$fName', ' ', '$lName'] },
                    'share.currentAmount': 1,
                    'share.initialAmount': 1,
                    'savings.currentAmount': 1,
                    'savings.initialAmount': 1,
                    'savings.amanat.amount': 1,
                    shareIncrease: { $subtract: ['$share.currentAmount', '$share.initialAmount'] },
                    savingsIncrease: { $subtract: ['$savings.currentAmount', '$savings.initialAmount'] },
                },
            }


        ]);

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
