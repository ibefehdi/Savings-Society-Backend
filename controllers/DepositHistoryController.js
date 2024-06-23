// depositHistoryController.js

const mongoose = require('mongoose');
const DepositHistory = require('../models/depositHistory');

// Function to get all deposit history records
const getAllDepositHistory = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const histories = await DepositHistory.find()
            .populate('shareholder')
            .populate('savings')
            .populate('admin')
            .populate('shares').skip(skip)
            .limit(resultsPerPage);

        histories.forEach((history, index) => {
            if (!history.shareholder) {
                console.log(`Empty or null shareholder at index ${index}:`, history.shareholder);
            }
        });
        const count = await DepositHistory.countDocuments()
        console.log(count)
        res.status(200).json({
            success: true,
            count: count,
            data: histories,
            metadata: { total: count }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to retrieve deposit histories',
            error: error.message
        });
    }
};

module.exports = {
    getAllDepositHistory
};
