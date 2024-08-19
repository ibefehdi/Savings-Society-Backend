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

        // Extract filter parameters
        const {
            membersCode,
            fullName,
            civilId,
            mobileNumber,
            withdrawalDate,
            previousAmount,
            newAmount,
            type,
            admin,
            year
        } = req.query;

        let aggregationPipeline = [
            {
                $lookup: {
                    from: 'shareholders',
                    localField: 'shareholder',
                    foreignField: '_id',
                    as: 'shareholderInfo'
                }
            },
            { $unwind: '$shareholderInfo' }
        ];

        // Shareholder filters
        if (membersCode) {
            aggregationPipeline.push({
                $match: { 'shareholderInfo.membersCode': { $regex: `^${membersCode}`, $options: 'i' } }
            });
        }
        if (fullName) {
            aggregationPipeline.push({
                $match: {
                    $or: [
                        { 'shareholderInfo.fName': { $regex: fullName, $options: 'i' } },
                        { 'shareholderInfo.lName': { $regex: fullName, $options: 'i' } }
                    ]
                }
            });
        }
        if (civilId) {
            aggregationPipeline.push({
                $match: { 'shareholderInfo.civilId': { $regex: `^${civilId}`, $options: 'i' } }
            });
        }
        if (mobileNumber) {
            aggregationPipeline.push({
                $match: { 'shareholderInfo.mobileNumber': { $regex: `^${mobileNumber}`, $options: 'i' } }
            });
        }

        // Other filters
        if (withdrawalDate) {
            aggregationPipeline.push({ $match: { withdrawalDate: new Date(withdrawalDate) } });
        }
        if (previousAmount) {
            aggregationPipeline.push({ $match: { previousAmount: previousAmount } });
        }
        if (newAmount) {
            aggregationPipeline.push({ $match: { newAmount: newAmount } });
        }
        if (type) {
            aggregationPipeline.push({ $match: { type: type } });
        }
        if (year) {
            aggregationPipeline.push({ $match: { year: year } });
        }
        if (admin) {
            aggregationPipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'admin',
                    foreignField: '_id',
                    as: 'adminInfo'
                }
            });
            aggregationPipeline.push({ $unwind: '$adminInfo' });
            aggregationPipeline.push({
                $match: {
                    $or: [
                        { 'adminInfo.fName': { $regex: admin, $options: 'i' } },
                        { 'adminInfo.lName': { $regex: admin, $options: 'i' } }
                    ]
                }
            });
        }

        // Count documents
        const countPipeline = [...aggregationPipeline];
        countPipeline.push({ $count: 'total' });
        const countResult = await WithdrawalHistory.aggregate(countPipeline);
        const count = countResult.length > 0 ? countResult[0].total : 0;

        // Add pagination
        aggregationPipeline.push({ $skip: skip });
        aggregationPipeline.push({ $limit: resultsPerPage });

        // Perform aggregation
        const histories = await WithdrawalHistory.aggregate(aggregationPipeline);

        // Manually populate references if needed
        await WithdrawalHistory.populate(histories, [
            { path: 'savings' },
            { path: 'shares' },
            { path: 'amanat' },
            { path: 'admin' },
            { path: 'shareholder' }
        ]);

        res.status(200).json({
            success: true,
            count: count,
            data: histories
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error: Unable to retrieve withdrawal histories',
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

        // Extract filter parameters
        const {
            membersCode,
            fullName,
            civilId,
            mobileNumber,
            date,
            amount,
            admin,
            fromSavings,
            toAmanat
        } = req.query;

        let aggregationPipeline = [
            {
                $lookup: {
                    from: 'shareholders',
                    localField: 'shareholder',
                    foreignField: '_id',
                    as: 'shareholderInfo'
                }
            },
            { $unwind: '$shareholderInfo' }
        ];

        // Shareholder filters
        if (membersCode) {
            aggregationPipeline.push({
                $match: { 'shareholderInfo.membersCode': { $regex: `^${membersCode}`, $options: 'i' } }
            });
        }
        if (fullName) {
            aggregationPipeline.push({
                $match: {
                    $or: [
                        { 'shareholderInfo.fName': { $regex: fullName, $options: 'i' } },
                        { 'shareholderInfo.lName': { $regex: fullName, $options: 'i' } }
                    ]
                }
            });
        }
        if (civilId) {
            aggregationPipeline.push({
                $match: { 'shareholderInfo.civilId': { $regex: `^${civilId}`, $options: 'i' } }
            });
        }
        if (mobileNumber) {
            aggregationPipeline.push({
                $match: { 'shareholderInfo.mobileNumber': { $regex: `^${mobileNumber}`, $options: 'i' } }
            });
        }

        // Other filters
        if (date) {
            aggregationPipeline.push({ $match: { date: new Date(date) } });
        }
        if (amount) {
            aggregationPipeline.push({ $match: { amount: parseFloat(amount) } });
        }
        if (admin) {
            aggregationPipeline.push({
                $lookup: {
                    from: 'users',
                    localField: 'admin',
                    foreignField: '_id',
                    as: 'adminInfo'
                }
            });
            aggregationPipeline.push({ $unwind: '$adminInfo' });
            aggregationPipeline.push({
                $match: {
                    $or: [
                        { 'adminInfo.fName': { $regex: admin, $options: 'i' } },
                        { 'adminInfo.lName': { $regex: admin, $options: 'i' } }
                    ]
                }
            });
        }
        if (fromSavings) {
            aggregationPipeline.push({
                $lookup: {
                    from: 'savings',
                    localField: 'fromSavings',
                    foreignField: '_id',
                    as: 'savingsInfo'
                }
            });
            aggregationPipeline.push({ $unwind: '$savingsInfo' });
            aggregationPipeline.push({ $match: { 'savingsInfo.totalAmount': parseFloat(fromSavings) } });
        }
        if (toAmanat) {
            aggregationPipeline.push({
                $lookup: {
                    from: 'amanats',
                    localField: 'toAmanat',
                    foreignField: '_id',
                    as: 'amanatInfo'
                }
            });
            aggregationPipeline.push({ $unwind: '$amanatInfo' });
            aggregationPipeline.push({ $match: { 'amanatInfo.amount': parseFloat(toAmanat) } });
        }

        // Count documents
        const countPipeline = [...aggregationPipeline];
        countPipeline.push({ $count: 'total' });
        const countResult = await TransferLog.aggregate(countPipeline);
        const count = countResult.length > 0 ? countResult[0].total : 0;

        // Add pagination
        aggregationPipeline.push({ $skip: skip });
        aggregationPipeline.push({ $limit: resultsPerPage });

        // Perform aggregation
        const transferLogs = await TransferLog.aggregate(aggregationPipeline);

        // Manually populate references if needed
        await TransferLog.populate(transferLogs, [
            { path: 'fromSavings', populate: { path: 'amanat', model: 'Amanat' } },
            { path: 'toAmanat' },
            { path: 'admin' },
            { path: 'shareholder' }
        ]);

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