const mongoose = require('mongoose');
const Flat = require('../models/flatSchema');
const Tenant = require('../models/tenantSchema');
const Contract = require('../models/contractSchema');
const Transaction = require('../models/transactionSchema');

exports.createTransaction = async (req, res) => {
    try {
        const { buildingId, flatId, amount, date, type, description, transactionFrom } = req.body;

        const transactionData = {
            buildingId,
            amount,
            date,
            type,
            transactionFrom,
            description,
        };

        // Add flatId to transactionData only if it's provided
        if (flatId) {
            transactionData.flatId = flatId;
        }

        const transaction = new Transaction(transactionData);

        await transaction.save();

        res.status(201).json({ message: 'Transaction created successfully', data: transaction });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};


exports.getAllTransactions = async (req, res) => {
    try {
        const { page = 1, resultsPerPage = 10, type } = req.query;
        const skip = (page - 1) * resultsPerPage;
        console.log(type)
        const transactions = await Transaction.find({ transactionFrom: type }).populate('buildingId').populate('flatId').populate('bookingId').skip(skip)
            .limit(resultsPerPage).exec();
        const count = await Transaction.countDocuments({ transactionFrom: type });
        console.log(transactions);
        res.status(200).json({
            data: transactions,
            count,
            metadata: {
                total: count,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

exports.getTransactionsByType = async (req, res) => {
    try {
        const { type } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const [transactions, count] = await Promise.all([
            Transaction.find({ type }).skip(skip).limit(limit).exec(),
            Transaction.countDocuments({ type }),
        ]);

        res.status(200).json({
            data: transactions,
            count,
            metadata: {
                total: count,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};