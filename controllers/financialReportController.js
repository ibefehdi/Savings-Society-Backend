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

        // Build query conditions dynamically
        if (req.query.status) queryConditions['status'] = req.query.status;
        if (req.query.fName) queryConditions['fName'] = { $regex: req.query.fName, $options: 'i' };
        if (req.query.civilId) queryConditions['civilId'] = { $regex: `^${req.query.civilId}`, $options: 'i' };
        if (req.query.membershipStatus) queryConditions['membershipStatus'] = req.query.membershipStatus;
        if (req.query.lName) queryConditions['lName'] = { $regex: req.query.lName, $options: 'i' };
        if (req.query.serial) queryConditions['serial'] = parseInt(req.query.serial, 10);
        if (req.query.gender) queryConditions['gender'] = { $regex: req.query.gender, $options: 'i' };

        console.log('queryConditions:', queryConditions);

        const pipeline = [
            { $match: queryConditions },
            {
                $lookup: {
                    from: 'savings',
                    localField: 'savings',
                    foreignField: '_id',
                    as: 'savingsDetails',
                    pipeline: [
                        {
                            $lookup: {
                                from: 'amanats',
                                localField: 'amanat',
                                foreignField: '_id',
                                as: 'amanatDetails'
                            }
                        },
                        { $unwind: { path: '$amanatDetails', preserveNullAndEmptyArrays: true } }
                    ]
                }
            },
            { $unwind: { path: '$savingsDetails', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'shares',
                    localField: 'share',
                    foreignField: '_id',
                    as: 'shareDetails'
                }
            },
            { $unwind: { path: '$shareDetails', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    membersCode: 1,
                    civilId: 1,
                    fullName: { $concat: ['$fName', ' ', '$lName'] },
                    'shareDetails.currentAmount': 1,
                    'shareDetails.initialAmount': 1,
                    'savingsDetails.currentAmount': 1,
                    'savingsDetails.initialAmount': 1,
                    'savingsDetails.amanatDetails.amount': 1,
                    shareIncrease: { $subtract: ['$shareDetails.currentAmount', '$shareDetails.initialAmount'] },
                    savingsIncrease: { $subtract: ['$savingsDetails.currentAmount', '$savingsDetails.initialAmount'] },
                    total: { $sum: ['$savingsDetails.currentAmount', '$shareDetails.currentAmount', '$savingsDetails.amanatDetails.amount'] }
                }
            },
            { $skip: skip },
            
        ];

        const shareholders = await Shareholder.aggregate(pipeline);

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
