const mongoose = require('mongoose');
const WithdrawalHistory = require('../models/withdrawalHistory');
const TransferLog = require('../models/transferLogSchema');
exports.getAllWithdrawalHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const histories = await WithdrawalHistory.find()
            .populate('shareholder')
            .populate('savings')
            .populate('admin')
            .populate('shares')
            .skip(skip)
            .limit(resultsPerPage);
        const count = await WithdrawalHistory.countDocuments();
        res.status(200).json({
            success: true,
            count: count,
            data: histories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to retrieve deposit histories',
            error: error.message
        });
    }
};
exports.getAllTransferLog = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        const transferLogs = await TransferLog.find()
            .populate({
                path: 'fromSavings',
                populate: {
                    path: 'amanat',
                    model: 'Amanat'
                }
            })
            .populate('toAmanat')
            .populate('admin')
            .populate('shareholder')
            .skip(skip)
            .limit(resultsPerPage);

        const count = await TransferLog.countDocuments();

        res.status(200).json({
            success: true,
            count: count,
            data: transferLogs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to retrieve transfer logs',
            error: error.message
        });
    }
};