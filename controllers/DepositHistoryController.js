// depositHistoryController.js

const mongoose = require('mongoose');
const DepositHistory = require('../models/depositHistory');  // Update path to where your model is stored

// Function to get all deposit history records
const getAllDepositHistory = async (req, res) => {
    try {
        const histories = await DepositHistory.find()
            .populate('shareholder')
            .populate('savings')
            .populate('admin')
            .populate('shares');
        res.status(200).json({
            success: true,
            count: histories.length,
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

module.exports = {
    getAllDepositHistory
};
