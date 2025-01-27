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

        // Build base query conditions
        let queryConditions = {};

        // Add direct filters
        if (withdrawalDate) {
            queryConditions.withdrawalDate = new Date(withdrawalDate);
        }
        if (previousAmount) {
            queryConditions.previousAmount = previousAmount;
        }
        if (newAmount) {
            queryConditions.newAmount = newAmount;
        }
        if (type) {
            queryConditions.type = type;
        }
        if (year) {
            queryConditions.year = year;
        }

        // Create base query
        let query = WithdrawalHistory.find(queryConditions);

        // Add shareholder population with optional filters
        const shareholderMatch = {};
        if (membersCode) shareholderMatch.membersCode = new RegExp(`^${membersCode}`, 'i');
        if (civilId) shareholderMatch.civilId = new RegExp(`^${civilId}`, 'i');
        if (mobileNumber) shareholderMatch.mobileNumber = new RegExp(`^${mobileNumber}`, 'i');
        if (fullName) {
            shareholderMatch.$or = [
                { fName: new RegExp(fullName, 'i') },
                { lName: new RegExp(fullName, 'i') }
            ];
        }

        query = query.populate({
            path: 'shareholder',
            match: Object.keys(shareholderMatch).length > 0 ? shareholderMatch : undefined
        });

        // Add admin population with optional filters
        if (admin) {
            query = query.populate({
                path: 'admin',
                match: {
                    $or: [
                        { fName: new RegExp(admin, 'i') },
                        { lName: new RegExp(admin, 'i') }
                    ]
                }
            });
        } else {
            query = query.populate('admin');
        }

        // Add other populations
        query = query
            .populate('savings')
            .populate('shares')
            .populate('amanat');

        // Execute query
        const histories = await query
            .skip(skip)
            .limit(resultsPerPage)
            .lean();

        // Filter out records where populated fields didn't match
        const filteredHistories = histories.filter(history => {
            const shareholderMatches = Object.keys(shareholderMatch).length === 0 || history.shareholder;
            const adminMatches = !admin || history.admin;
            return shareholderMatches && adminMatches;
        });

        // Get total count based on filtered results
        const totalFilteredCount = await WithdrawalHistory
            .find(queryConditions)
            .populate({
                path: 'shareholder',
                match: shareholderMatch
            })
            .populate({
                path: 'admin',
                match: admin ? {
                    $or: [
                        { fName: new RegExp(admin, 'i') },
                        { lName: new RegExp(admin, 'i') }
                    ]
                } : undefined
            })
            .countDocuments();

        res.status(200).json({
            success: true,
            count: totalFilteredCount,
            data: filteredHistories
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
            'رقم العضوية', ' الاسم', 'نوع العملية', 'الرصيد السابق', 'الرصيد الجديد',
            'تاريخ السحب', 'الادارة'
        ]);

        // Add data rows
        reportData.forEach(record => {
            worksheet.addRow([
                record.membersCode,
                record.fullName,
                record.type,
                record.previousAmount,
                record.newAmount,
                record.withdrawalDate,
                record.adminName,
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