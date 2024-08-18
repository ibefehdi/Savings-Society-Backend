const mongoose = require('mongoose');
const Flat = require('../models/flatSchema');
const Tenant = require('../models/tenantSchema');
const Contract = require('../models/contractSchema');
const Transaction = require('../models/transactionSchema');
const { stringify } = require('csv-stringify');
const moment = require('moment');


exports.getAllTransactionsCSV = async (req, res) => {
    try {
        const { transactionType } = req.query;

        const transactions = await Transaction.find({ type: transactionType })
            .populate('buildingId')
            .populate('flatId')
            .populate('bookingId')
            .sort({ date: -1 })
            .lean()
            .exec();

        const csvStringifier = stringify({
            header: true,
            columns: [
                'نوع المعاملة',
                'المبلغ',
                'التاريخ',
                'من',
                'المبنى',
                'الشقة',
                'الحجز',
                'الوصف'
            ]
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        transactions.forEach((transaction) => {
            const row = {
                'نوع المعاملة': transaction.type || 'N/A',
                'المبلغ': transaction.amount || 'N/A',
                'التاريخ': moment(transaction.date).format('YYYY-MM-DD') || 'N/A',
                'من': transaction.transactionFrom || 'N/A',
                'المبنى': transaction.buildingId ? transaction.buildingId.name : 'N/A',
                'الشقة': transaction.flatId ? transaction.flatId.flatNumber : 'N/A',
                'الحجز': transaction.bookingId ? moment(transaction.bookingId.dateOfEvent).format('YYYY-MM-DD') : 'N/A',
                'الوصف': transaction.description || 'N/A'
            };

            csvStringifier.write(row);
        });

        csvStringifier.end();

    } catch (error) {
        console.error("Error exporting transactions to CSV:", error);
        res.status(500).json({ message: "Error exporting transactions to CSV", error: error.message });
    }
};

exports.createTransaction = async (req, res) => {
    try {
        const { buildingId, flatId, amount, date, type, description, transactionFrom } = req.body;
        console.log(req.body)
        // Validate required fields
        if (!buildingId || !amount || !date || !type || !transactionFrom) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const transactionData = {
            buildingId,
            amount,
            date: new Date(date),
            type,
            transactionFrom,
            description,
        };



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
        const { page = 1, resultsPerPage = 10, transactionType } = req.query;
        const skip = (page - 1) * resultsPerPage;
        const transactions = await Transaction.find({ type: transactionType }).populate('buildingId').populate('flatId').populate('bookingId').skip(skip)
            .limit(resultsPerPage).exec();
        const count = await Transaction.countDocuments({ type: transactionType });
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
exports.getProfitReportCSV = async (req, res) => {
    try {
        const [incomes, expenses] = await Promise.all([
            Transaction.aggregate([
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
                { $unwind: '$building' },
                {
                    $project: {
                        buildingId: '$_id',
                        buildingName: '$building.name',
                        buildingType: '$building.type',
                        totalIncome: 1,
                    },
                },
            ]),
            Transaction.aggregate([
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
                { $unwind: '$building' },
                {
                    $project: {
                        buildingId: '$_id',
                        buildingName: '$building.name',
                        buildingType: '$building.type',
                        totalExpenses: 1,
                    },
                },
            ])
        ]);

        const profitReport = incomes.map(income => {
            const expense = expenses.find(e => e.buildingId.toString() === income.buildingId.toString());
            return {
                buildingId: income.buildingId,
                buildingName: income.buildingName,
                buildingType: income.buildingType,
                totalIncome: income.totalIncome,
                totalExpenses: expense ? expense.totalExpenses : 0,
                profit: income.totalIncome - (expense ? expense.totalExpenses : 0)
            };
        });

        // Add buildings that only have expenses
        expenses.forEach(expense => {
            if (!profitReport.find(report => report.buildingId.toString() === expense.buildingId.toString())) {
                profitReport.push({
                    buildingId: expense.buildingId,
                    buildingName: expense.buildingName,
                    buildingType: expense.buildingType,
                    totalIncome: 0,
                    totalExpenses: expense.totalExpenses,
                    profit: -expense.totalExpenses
                });
            }
        });

        const totalIncome = profitReport.reduce((sum, report) => sum + report.totalIncome, 0);
        const totalExpenses = profitReport.reduce((sum, report) => sum + report.totalExpenses, 0);
        const totalProfit = totalIncome - totalExpenses;

        profitReport.push({
            buildingId: 'total',
            buildingName: 'Total',
            buildingType: '',
            totalIncome,
            totalExpenses,
            profit: totalProfit
        });

        const csvStringifier = stringify({
            header: true,
            columns: [
                'اسم المبنى',
                'نوع المبنى',
                'إجمالي الدخل',
                'إجمالي النفقات',
                'الربح'
            ]
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="profit_report.csv"');
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        profitReport.forEach((report) => {
            csvStringifier.write({
                'اسم المبنى': report.buildingName,
                'نوع المبنى': report.buildingType,
                'إجمالي الدخل': report.totalIncome.toFixed(2),
                'إجمالي النفقات': report.totalExpenses.toFixed(2),
                'الربح': report.profit.toFixed(2)
            });
        });

        csvStringifier.end();

    } catch (error) {
        console.error("Error exporting profit report to CSV:", error);
        res.status(500).json({ message: "Error exporting profit report to CSV", error: error.message });
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
exports.getProfitReportByFlatCSV = async (req, res) => {
    try {
        const [incomes, expenses] = await Promise.all([
            Transaction.aggregate([
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
                { $unwind: '$flat' },
                {
                    $lookup: {
                        from: 'buildings',
                        localField: 'flat.buildingId',
                        foreignField: '_id',
                        as: 'building',
                    },
                },
                { $unwind: '$building' },
                {
                    $project: {
                        flatId: '$_id',
                        flatNumber: '$flat.flatNumber',
                        buildingName: '$building.name',
                        totalIncome: 1,
                    },
                },
            ]),
            Transaction.aggregate([
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
                { $unwind: '$flat' },
                {
                    $lookup: {
                        from: 'buildings',
                        localField: 'flat.buildingId',
                        foreignField: '_id',
                        as: 'building',
                    },
                },
                { $unwind: '$building' },
                {
                    $project: {
                        flatId: '$_id',
                        flatNumber: '$flat.flatNumber',
                        buildingName: '$building.name',
                        totalExpenses: 1,
                    },
                },
            ])
        ]);

        const profitReport = incomes.map(income => {
            const expense = expenses.find(e => e.flatId.toString() === income.flatId.toString());
            return {
                flatId: income.flatId,
                flatNumber: income.flatNumber,
                buildingName: income.buildingName,
                totalIncome: income.totalIncome,
                totalExpenses: expense ? expense.totalExpenses : 0,
                profit: income.totalIncome - (expense ? expense.totalExpenses : 0)
            };
        });

        // Add flats that only have expenses
        expenses.forEach(expense => {
            if (!profitReport.find(report => report.flatId.toString() === expense.flatId.toString())) {
                profitReport.push({
                    flatId: expense.flatId,
                    flatNumber: expense.flatNumber,
                    buildingName: expense.buildingName,
                    totalIncome: 0,
                    totalExpenses: expense.totalExpenses,
                    profit: -expense.totalExpenses
                });
            }
        });

        const totalIncome = profitReport.reduce((sum, report) => sum + report.totalIncome, 0);
        const totalExpenses = profitReport.reduce((sum, report) => sum + report.totalExpenses, 0);
        const totalProfit = totalIncome - totalExpenses;

        profitReport.push({
            flatId: 'total',
            flatNumber: 'Total',
            buildingName: '',
            totalIncome,
            totalExpenses,
            profit: totalProfit
        });

        const csvStringifier = stringify({
            header: true,
            columns: [
                'رقم الشقة',
                'اسم المبنى',
                'إجمالي الدخل',
                'إجمالي النفقات',
                'الربح'
            ]
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="profit_report_by_flat.csv"');
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        profitReport.forEach((report) => {
            csvStringifier.write({
                'رقم الشقة': report.flatNumber,
                'اسم المبنى': report.buildingName,
                'إجمالي الدخل': report.totalIncome.toFixed(2),
                'إجمالي النفقات': report.totalExpenses.toFixed(2),
                'الربح': report.profit.toFixed(2)
            });
        });

        csvStringifier.end();

    } catch (error) {
        console.error("Error exporting profit report by flat to CSV:", error);
        res.status(500).json({ message: "Error exporting profit report by flat to CSV", error: error.message });
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