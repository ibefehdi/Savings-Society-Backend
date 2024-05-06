// depositHistoryController.js

const mongoose = require('mongoose');
const DepositHistory = require('../models/depositHistory');

// Function to get all deposit history records
const getAllDepositHistory = async (req, res) => {
    try {

        const histories = await DepositHistory.find()
            .populate('shareholder')
            .populate('savings')
            .populate('admin')
            .populate('shares');

        const count = await DepositHistory.countDocuments()
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
