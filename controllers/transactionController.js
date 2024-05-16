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


exports.getExpensesByBuilding = async (req, res) => {
    try {
        const expenses = await Transaction.aggregate([
            { $match: { type: 'Expense' } },
            {
                $group: {
                    _id: '$buildingId',
                    totalExpenses: { $sum: '$amount' },
                },
            },
            {
                $lookup: {
                    from: 'buildings',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'building',
                },
            },
            {
                $unwind: '$building',
            },
            {
                $project: {
                    _id: 0,
                    buildingId: '$_id',
                    buildingName: '$building.name',
                    buildingType: '$building.type',
                    totalExpenses: 1,
                },
            },
        ]);

        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalExpenses, 0);

        res.json({ expenses, totalExpenses });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
    }
};

exports.getIncomeByBuilding = async (req, res) => {
    try {
        const incomes = await Transaction.aggregate([
            { $match: { type: 'Income' } },
            {
                $group: {
                    _id: '$buildingId',
                    totalIncome: { $sum: '$amount' },
                },
            },
            {
                $lookup: {
                    from: 'buildings',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'building',
                },
            },
            {
                $unwind: '$building',
            },
            {
                $project: {
                    _id: 0,
                    buildingId: '$_id',
                    buildingName: '$building.name',
                    buildingType: '$building.type',
                    totalIncome: 1,
                },
            },
        ]);

        const totalIncome = incomes.reduce((sum, income) => sum + income.totalIncome, 0);

        res.json({ incomes, totalIncome });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
    }
};

exports.getExpensesByFlat = async (req, res) => {
    try {
        const expenses = await Transaction.aggregate([
            { $match: { type: 'Expense', transactionFrom: 'Flat' } },
            {
                $group: {
                    _id: '$flatId',
                    totalExpenses: { $sum: '$amount' },
                },
            },
            {
                $lookup: {
                    from: 'flats',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'flat',
                },
            },
            {
                $unwind: '$flat',
            },
            {
                $lookup: {
                    from: 'buildings',
                    localField: 'flat.buildingId',
                    foreignField: '_id',
                    as: 'building',
                },
            },
            {
                $unwind: '$building',
            },
            {
                $project: {
                    _id: 0,
                    flatId: '$_id',
                    flatNumber: '$flat.flatNumber',
                    buildingName: '$building.name',
                    totalExpenses: 1,
                },
            },
        ]);

        res.json({ expenses });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
    }
};

exports.getIncomeByFlat = async (req, res) => {
    try {
        const incomes = await Transaction.aggregate([
            { $match: { type: 'Income', transactionFrom: 'Flat' } },
            {
                $group: {
                    _id: '$flatId',
                    totalIncome: { $sum: '$amount' },
                },
            },
            {
                $lookup: {
                    from: 'flats',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'flat',
                },
            },
            {
                $unwind: '$flat',
            },
            {
                $lookup: {
                    from: 'buildings',
                    localField: 'flat.buildingId',
                    foreignField: '_id',
                    as: 'building',
                },
            },
            {
                $unwind: '$building',
            },
            {
                $project: {
                    _id: 0,
                    flatId: '$_id',
                    flatNumber: '$flat.flatNumber',
                    buildingName: '$building.name',
                    totalIncome: 1,
                },
            },
        ]);

        res.json({ incomes });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
    }
};

exports.getTransactionsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const transactions = await Transaction.find({
            date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        });
        res.json({ transactions });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
    }
};

exports.getTransactionsByBuildingAndDateRange = async (req, res) => {
    try {
        const { buildingId, startDate, endDate } = req.query;
        const transactions = await Transaction.find({
            buildingId,
            date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        });
        res.json({ transactions });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred' });
    }
};