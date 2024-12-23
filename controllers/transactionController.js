const mongoose = require('mongoose');
const Flat = require('../models/flatSchema');
const Tenant = require('../models/tenantSchema');
const Contract = require('../models/contractSchema');
const Transaction = require('../models/transactionSchema');
const { stringify } = require('csv-stringify');
const moment = require('moment');
const ExcelJS = require('exceljs');
const Voucher = require('../models/voucherSchema');

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

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transactions');

        worksheet.columns = [
            { header: 'نوع المعاملة', key: 'type', width: 15 },
            { header: 'المبلغ', key: 'amount', width: 15 },
            { header: 'التاريخ', key: 'date', width: 15 },
            { header: 'من', key: 'from', width: 20 },
            { header: 'المبنى', key: 'building', width: 20 },
            { header: 'الشقة', key: 'flat', width: 15 },
            { header: 'الحجز', key: 'booking', width: 15 },
            { header: 'الوصف', key: 'description', width: 30 }
        ];

        // Function to format date as dd/mm/yyyy
        const formatDate = (date) => {
            if (!date) return 'N/A';
            return moment(date).format('DD/MM/YYYY');
        };

        let totalAmount = 0;

        // Add data rows
        transactions.forEach((transaction) => {
            const amount = transaction.amount || 0;
            totalAmount += amount;

            worksheet.addRow({
                type: transaction.type || 'N/A',
                amount: amount,
                date: formatDate(transaction.date),
                from: transaction.transactionFrom || 'N/A',
                building: transaction.buildingId ? transaction.buildingId.name : 'N/A',
                flat: transaction.flatId ? transaction.flatId.flatNumber : 'N/A',
                booking: transaction.bookingId ? formatDate(transaction.bookingId.dateOfEvent) : 'N/A',
                description: transaction.description || 'N/A'
            });
        });

        // Add total row
        worksheet.addRow({
            type: 'المجموع الكلي',
            amount: totalAmount,
            date: '',
            from: '',
            building: '',
            flat: '',
            booking: '',
            description: ''
        });

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Style the total row
        const lastRow = worksheet.lastRow;
        lastRow.font = { bold: true };
        lastRow.getCell('type').alignment = { horizontal: 'right' };
        lastRow.getCell('amount').alignment = { horizontal: 'left' };

        // Set text direction for the entire sheet to RTL
        worksheet.views = [
            { rightToLeft: true }
        ];

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="transactions.xlsx"');
        res.send(buffer);
    } catch (error) {
        console.error("Error exporting transactions to XLSX:", error);
        res.status(500).json({ message: "Error exporting transactions to XLSX", error: error.message });
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
        // Get all paid vouchers (income)
        const incomes = await Voucher.aggregate([
            { $match: { status: 'Paid' } },
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
        ]);

        // Get all expenses (assuming expenses are also tracked in Vouchers with a different type)
        const expenses = await Voucher.aggregate([
            { $match: { status: 'Paid', type: 'Expense' } },
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

        // Calculate totals
        const totalIncome = profitReport.reduce((sum, report) => sum + report.totalIncome, 0);
        const totalExpenses = profitReport.reduce((sum, report) => sum + report.totalExpenses, 0);
        const totalProfit = totalIncome - totalExpenses;

        // Add totals row
        profitReport.push({
            buildingId: 'total',
            buildingName: 'Total',
            buildingType: '',
            totalIncome,
            totalExpenses,
            profit: totalProfit
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Profit Report');

        // Define columns with Arabic headers
        worksheet.columns = [
            { header: 'اسم المبنى', key: 'buildingName', width: 20 },
            { header: 'نوع المبنى', key: 'buildingType', width: 15 },
            { header: 'إجمالي الدخل', key: 'totalIncome', width: 15 },
            { header: 'إجمالي النفقات', key: 'totalExpenses', width: 15 },
            { header: 'الربح', key: 'profit', width: 15 }
        ];

        // Add data rows
        profitReport.forEach((report) => {
            worksheet.addRow({
                buildingName: report.buildingName,
                buildingType: report.buildingType,
                totalIncome: Number(report.totalIncome.toFixed(2)),
                totalExpenses: Number(report.totalExpenses.toFixed(2)),
                profit: Number(report.profit.toFixed(2))
            });
        });

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Set text direction for the entire sheet to RTL
        worksheet.views = [
            { rightToLeft: true }
        ];

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers and send file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="profit_report.xlsx"');
        res.send(buffer);

    } catch (error) {
        console.error("Error exporting profit report to XLSX:", error);
        res.status(500).json({ message: "Error exporting profit report to XLSX", error: error.message });
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
        const incomes = await Voucher.aggregate([
            // Only include Paid vouchers since they represent confirmed income
            { $match: { status: 'Paid' } },
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
        console.error('Error in getIncomeByBuilding:', error);
        res.status(500).json({ error: 'An error occurred while fetching income data' });
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
        const buildingId = req.params.buildingId;

        // Convert buildingId string to ObjectId
        const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

        const incomes = await Voucher.aggregate([
            // Match vouchers for the specific building and paid status
            {
                $match: {
                    buildingId: buildingObjectId,
                    status: 'Paid'
                }
            },
            {
                $group: {
                    _id: '$flatId',
                    totalIncome: { $sum: '$amount' },
                    // Store the buildingId for later lookup
                    buildingId: { $first: '$buildingId' }
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
                    localField: 'buildingId',
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
            // Sort by flat number for better readability
            { $sort: { flatNumber: 1 } }
        ]);

        // Calculate total income for the building
        const totalBuildingIncome = incomes.reduce((sum, income) => sum + income.totalIncome, 0);

        res.json({
            buildingId,
            buildingName: incomes[0]?.buildingName || '',
            totalBuildingIncome,
            flats: incomes
        });

    } catch (error) {
        console.error('Error in getIncomeByFlat:', error);
        res.status(500).json({
            error: 'An error occurred while fetching flat income data',
            details: error.message
        });
    }
};
exports.getProfitReportByFlatCSV = async (req, res) => {
    try {
        const buildingId = req.params.buildingId;
        const buildingObjectId = new mongoose.Types.ObjectId(buildingId);

        // Get all paid income vouchers for the specific building
        const incomes = await Voucher.aggregate([
            {
                $match: {
                    buildingId: buildingObjectId,
                    status: 'Paid'
                }
            },
            {
                $group: {
                    _id: '$flatId',
                    totalIncome: { $sum: '$amount' },
                    buildingId: { $first: '$buildingId' }
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
                    localField: 'buildingId',
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
            { $sort: { flatNumber: 1 } }
        ]);

        // Get all paid expense vouchers for the specific building
        const expenses = await Voucher.aggregate([
            {
                $match: {
                    buildingId: buildingObjectId,
                    status: 'Paid',
                    type: 'Expense'
                }
            },
            {
                $group: {
                    _id: '$flatId',
                    totalExpenses: { $sum: '$amount' },
                    buildingId: { $first: '$buildingId' }
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
                    localField: 'buildingId',
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
            { $sort: { flatNumber: 1 } }
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

        // Calculate totals
        const totalIncome = profitReport.reduce((sum, report) => sum + report.totalIncome, 0);
        const totalExpenses = profitReport.reduce((sum, report) => sum + report.totalExpenses, 0);
        const totalProfit = totalIncome - totalExpenses;

        // Add totals row
        profitReport.push({
            flatId: 'total',
            flatNumber: 'Total',
            buildingName: profitReport[0]?.buildingName || '',
            totalIncome,
            totalExpenses,
            profit: totalProfit
        });

        // Create Excel workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Profit Report by Flat');

        // Define columns with Arabic headers
        worksheet.columns = [
            { header: 'رقم الشقة', key: 'flatNumber', width: 15 },
            { header: 'اسم المبنى', key: 'buildingName', width: 20 },
            { header: 'إجمالي الدخل', key: 'totalIncome', width: 15 },
            { header: 'إجمالي النفقات', key: 'totalExpenses', width: 15 },
            { header: 'الربح', key: 'profit', width: 15 }
        ];

        // Add data rows
        profitReport.forEach((report) => {
            worksheet.addRow({
                flatNumber: report.flatNumber,
                buildingName: report.buildingName,
                totalIncome: Number(report.totalIncome.toFixed(2)),
                totalExpenses: Number(report.totalExpenses.toFixed(2)),
                profit: Number(report.profit.toFixed(2))
            });
        });

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Set text direction for the entire sheet to RTL
        worksheet.views = [
            { rightToLeft: true }
        ];

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();

        // Set response headers and send file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="profit_report_by_flat.xlsx"');
        res.send(buffer);

    } catch (error) {
        console.error("Error exporting profit report by flat to XLSX:", error);
        res.status(500).json({ 
            message: "Error exporting profit report by flat to XLSX", 
            error: error.message 
        });
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