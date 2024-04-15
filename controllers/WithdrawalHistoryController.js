const mongoose = require('mongoose');
const WithdrawalHistory = require('../models/withdrawalHistory');  // Update path to where your model is stored
exports.getAllWithdrawalHistory = async (req, res) => {
    try {
        const histories = await WithdrawalHistory.find()
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