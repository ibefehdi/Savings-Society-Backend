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
        const histories = await DepositHistory.find()
            .populate('shareholder')
            .populate('savings')
            .populate('admin')
            .populate('shares').skip(skip)
            .limit(resultsPerPage);

        histories.forEach((history, index) => {
            if (!history.shareholder) {
                console.log(`Empty or null shareholder at index ${index}:`, history.shareholder);
            }
        });
        const count = await DepositHistory.countDocuments()
        console.log(count)
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
                previousAmount: history.previousAmount,
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
            'Members Code', 'Full Name', 'Type', 'Previous Amount', 'New Amount',
            'Deposit Amount', 'Deposit Date', 'Admin'
        ]);

        // Add data rows
        reportData.forEach(record => {
            worksheet.addRow([
                record.membersCode,
                record.fullName,
                record.type,
                record.previousAmount,
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
