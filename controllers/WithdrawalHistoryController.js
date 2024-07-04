const mongoose = require('mongoose');
const excel = require('exceljs');
const Shareholder = require('../models/shareholderSchema');
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
exports.getWithdrawalHistoryReportExport = async (req, res) => {
    try {
        const { year, membersCode, type, format } = req.query;
        let queryConditions = {};

        // Construct query conditions
        if (year) queryConditions.year = year;
        if (type) queryConditions.type = type;

        // If membersCode is provided, first find the corresponding shareholder
        if (membersCode) {
            const shareholder = await Shareholder.findOne({ membersCode });
            if (shareholder) {
                queryConditions.shareholder = shareholder._id;
            } else {
                // If no shareholder found with the given membersCode, return an empty report
                return res.status(404).json({ error: 'No shareholder found with the given members code' });
            }
        }

        // Retrieve all withdrawal histories from the database with populated fields
        const withdrawalHistories = await WithdrawalHistory.find(queryConditions)
            .populate('shareholder')
            .populate('savings')
            .populate('shares')
            .populate('amanat')
            .populate('admin');

        // Prepare an array to store the withdrawal history report data
        const reportData = withdrawalHistories.map(history => {
            return {
                membersCode: history.shareholder ? history.shareholder.membersCode : 'N/A',
                fullName: history.shareholder ? `${history.shareholder.fName} ${history.shareholder.lName}` : 'N/A',
                type: history.type,
                previousAmount: history.previousAmount,
                newAmount: history.newAmount,
                withdrawalAmount: parseFloat(history.previousAmount) - parseFloat(history.newAmount),
                withdrawalDate: history.withdrawalDate,
                adminName: history.admin ? `${history.admin.fName} ${history.admin.lName}` : 'N/A',
                year: history.year
            };
        });

        // Prepare the workbook and worksheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Withdrawal History Report');

        // Add headers
        worksheet.addRow([
            'Members Code', 'Full Name', 'Type', 'Previous Amount', 'New Amount',
            'Withdrawal Amount', 'Withdrawal Date', 'Admin', 'Year'
        ]);

        // Add data rows
        reportData.forEach(record => {
            worksheet.addRow([
                record.membersCode,
                record.fullName,
                record.type,
                record.previousAmount,
                record.newAmount,
                record.withdrawalAmount,
                record.withdrawalDate,
                record.adminName,
                record.year
            ]);
        });

        // Set content type and disposition based on format
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=withdrawal_history_report.csv');
            await workbook.csv.write(res);
        } else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=withdrawal_history_report.xlsx');
            await workbook.xlsx.write(res);
        }

        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
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