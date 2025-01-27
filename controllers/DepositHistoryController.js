// depositHistoryController.js
const excel = require('exceljs');
const Shareholder = require('../models/shareholderSchema');

const mongoose = require('mongoose');
const DepositHistory = require('../models/depositHistory');

// Function to get all deposit history records
const getAllDepositHistory = async (req, res) => {
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
            depositDate,
            previousAmount,
            newAmount,
            type,
            admin
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
        if (depositDate) {
            aggregationPipeline.push({ $match: { depositDate: new Date(depositDate) } });
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
        const countResult = await DepositHistory.aggregate(countPipeline);
        const count = countResult.length > 0 ? countResult[0].total : 0;

        // Add pagination
        aggregationPipeline.push({ $skip: skip });
        aggregationPipeline.push({ $limit: resultsPerPage });

        // Perform aggregation
        const histories = await DepositHistory.aggregate(aggregationPipeline);

        // Manually populate references if needed
        await DepositHistory.populate(histories, [
            { path: 'savings' },
            { path: 'shares' },
            { path: 'admin' },
            { path: 'shareholder' }
        ]);

        // Check for empty or null shareholders
        histories.forEach((history, index) => {
            if (!history.shareholder) {
                console.log(`Empty or null shareholder at index ${index}:`, history.shareholder);
            }
        });

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

const getDepositHistoryReportExport = async (req, res) => {
    try {
        const { year, membersCode, type, format } = req.query;
        let queryConditions = {};

        // Construct query conditions
        if (year) queryConditions.depositDate = { $gte: new Date(year, 0, 1), $lt: new Date(parseInt(year) + 1, 0, 1) };
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

        // Retrieve all deposit histories from the database with populated fields
        const depositHistories = await DepositHistory.find(queryConditions)
            .populate('shareholder')
            .populate('savings')
            .populate('shares')
            .populate('admin');

        // Prepare an array to store the deposit history report data
        const reportData = depositHistories.map(history => {
            return {
                membersCode: history.shareholder ? history.shareholder.membersCode : 'N/A',
                fullName: history.shareholder ? `${history.shareholder.fName} ${history.shareholder.lName}` : 'N/A',
                type: history.type,
                // previousAmount: history.previousAmount,
                newAmount: history.newAmount,
                depositAmount: parseFloat(history.newAmount) - parseFloat(history.previousAmount),
                depositDate: history.depositDate,
                adminName: history.admin ? `${history.admin.fName} ${history.admin.lName}` : 'N/A'
            };
        });

        // Prepare the workbook and worksheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Deposit History Report');

        // Add headers
        worksheet.addRow([
            'رقم العضوية', 'الاسم', 'نوع العملية', 'الرصيد السابق', 'الرصيد الجديد',
            'قيمة الايداع', 'تاريخ الايداع', 'الادارة'
        ]);

        // Add data rows
        reportData.forEach(record => {
            worksheet.addRow([
                record.membersCode,
                record.fullName,
                record.type,
                // record.previousAmount,
                record.newAmount,
                record.depositAmount,
                record.depositDate,
                record.adminName
            ]);
        });

        // Set content type and disposition based on format
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=deposit_history_report.csv');
            await workbook.csv.write(res);
        } else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=deposit_history_report.xlsx');
            await workbook.xlsx.write(res);
        }

        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
module.exports = {
    getAllDepositHistory, getDepositHistoryReportExport
};
