const Shareholder = require('../models/shareholderSchema');
const WithdrawalHistory = require('../models/withdrawalHistory');
const TransferLog = require('../models/transferLogSchema')
const xss = require('xss');
const excel = require('exceljs');
const { Readable } = require('stream');

exports.getAllShareholderAmanatReport = async (req, res) => {
    try {
        const { year, membersCode, fName, lName, civilId, gender, area } = req.query;
        const queryConditions = { status: 0 };

        // Construct query conditions
        if (year) queryConditions.year = year;
        if (membersCode) queryConditions.membersCode = membersCode;
        if (fName) queryConditions.fName = fName;
        if (lName) queryConditions.lName = lName;
        if (civilId) queryConditions.civilId = civilId;
        // if (status) queryConditions.status = status;
        if (gender) queryConditions.gender = gender;
        if (area) queryConditions.Area = area;
        // Retrieve all shareholders from the database with populated fields
        const shareholders = await Shareholder.find(queryConditions)
            .populate('share')
            .populate({ path: 'savings', populate: { path: 'amanat', model: 'Amanat' } });

        // Filter shareholders who have amanat
        const shareholdersWithAmanat = shareholders.filter(shareholder => shareholder.savings && shareholder.savings.amanat);

        // Prepare an array to store the amanat reporting for each shareholder
        const amanatReports = shareholdersWithAmanat.map(shareholder => {
            const { _id, membersCode, civilId, fName, lName, savings } = shareholder;

            // Extract amanat details
            const amanatAmount = savings.amanat ? savings.amanat.amount : 0;

            // Prepare the amanat reporting object for the shareholder
            return {
                _id,
                membersCode,
                civilId,
                fullName: `${fName} ${lName}`,
                amanatAmount,
                total: amanatAmount,
                amanatDetails: savings.amanat
            };
        });

        const count = amanatReports.length;
        const grandTotal = amanatReports.reduce((sum, report) => sum + report.amanatAmount, 0);
        console.log(grandTotal)
        res.json({
            data: amanatReports,
            count: count,
            grandTotal: grandTotal,
            metadata: { total: count }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const { stringify } = require('csv-stringify');
const moment = require('moment');

exports.getAllShareholderAmanatReportExport = async (req, res) => {
    try {
        const { year, membersCode, fName, lName, civilId, gender, area } = req.query;
        const queryConditions = { status: 0 };

        // Construct query conditions
        if (year) queryConditions.year = year;
        if (membersCode) queryConditions.membersCode = membersCode;
        if (fName) queryConditions.fName = { $regex: fName, $options: 'i' };
        if (lName) queryConditions.lName = { $regex: lName, $options: 'i' };
        if (civilId) queryConditions.civilId = { $regex: `^${civilId}`, $options: 'i' };
        if (gender) queryConditions.gender = gender;
        if (area) queryConditions.Area = area;

        // Retrieve all shareholders from the database with populated fields
        const shareholders = await Shareholder.find(queryConditions)
            .populate('share')
            .populate({ path: 'savings', populate: { path: 'amanat', model: 'Amanat' } });

        // Filter shareholders who have amanat
        const shareholdersWithAmanat = shareholders.filter(shareholder => shareholder.savings && shareholder.savings.amanat);

        // Set up CSV stringifier
        const csvStringifier = stringify({
            header: true,
            columns: [
                'رقم العضوية',
                'الرقم المدني',
                'الاسم الكامل',
                'قيمة الأمانات',
                'المجموع',
            ]
        });

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="shareholder_amanat_report.csv"');
        res.write('\uFEFF');  // UTF-8 BOM

        // Pipe the CSV stringifier to the response
        csvStringifier.pipe(res);

        // Write data for each shareholder
        let grandTotal = 0;
        shareholdersWithAmanat.forEach((shareholder) => {
            const { membersCode, civilId, fName, lName, savings } = shareholder;
            const amanatAmount = savings.amanat ? savings.amanat.amount : 0;
            grandTotal += amanatAmount;

            const row = {
                'رقم العضوية': membersCode || '',
                'الرقم المدني': civilId || '',
                'الاسم الكامل': `${fName} ${lName}`,
                'قيمة الأمانات': amanatAmount.toFixed(3),
                'المجموع': amanatAmount.toFixed(3),
            };

            csvStringifier.write(row);
        });

        // Add a total row at the end
        csvStringifier.write({
            'رقم العضوية': '',
            'الرقم المدني': '',
            'الاسم الكامل': 'المجموع الكلي',
            'قيمة الأمانات': grandTotal.toFixed(3),
            'المجموع': grandTotal.toFixed(3),
            'تفاصيل الأمانات': ''
        });

        // End the CSV stringifier
        csvStringifier.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAllShareholderReport = async (req, res) => {
    try {
        const { year, membersCode, fName, lName, civilId, gender, area } = req.query;
        const queryConditions = { status: 0 };

        // Construct query conditions
        if (year) queryConditions.year = year;
        if (membersCode) queryConditions.membersCode = membersCode;
        if (fName) queryConditions.fName = fName;
        if (lName) queryConditions.lName = lName;
        if (civilId) queryConditions.civilId = civilId;
        if (gender) queryConditions.gender = gender;
        if (area) queryConditions.Area = area;

        // Retrieve all shareholders from the database with populated fields
        const shareholders = await Shareholder.find(queryConditions)
            .populate('share')
            .populate({ path: 'savings', populate: { path: 'amanat', model: 'Amanat' } });

        // Prepare an array to store the financial reporting for each shareholder
        const financialReports = await Promise.all(shareholders.map(async shareholder => {
            const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

            // Calculate the share increase and current amount
            let shareIncrease = 0;
            let shareCurrentAmount = 0;
            if (share && share.purchases) {
                share.purchases.forEach(purchase => {
                    shareIncrease += purchase.currentAmount - purchase.initialAmount;
                });
                shareCurrentAmount = share.totalAmount;
            }

            // Get the savings increase directly from the savings record
            let savingsIncrease = savings ? savings.savingsIncrease : 0;
            let savingsCurrentAmount = savings ? savings.totalAmount : 0;

            // Calculate the amanat amount
            let amanatAmount = 0;
            if (savings && savings.amanat) {
                amanatAmount = savings.amanat.amount;
            }

            // Calculate the total
            const total = savingsCurrentAmount + amanatAmount + savingsIncrease;

            // Fetch withdrawal history for this shareholder
            const withdrawalHistories = await TransferLog.find({
                shareholder: _id,
                transferType: 'Savings'
            });

            // Calculate transferSavings
            const transferSavings = withdrawalHistories.reduce((total, history) => {
                return (history.amount || 0);
            }, 0);

            // Prepare the financial reporting object for the shareholder
            return {
                _id,
                membersCode,
                civilId,
                savingsDetails: savings || {},
                shareDetails: share || {},
                fullName: `${fName} ${lName}`,
                shareIncrease,
                shareCurrentAmount,
                savingsIncrease,
                savingsCurrentAmount,
                amanatAmount,
                total,
                transferSavings
            };
        }));

        const count = shareholders.length;
        const grandTotal = financialReports.reduce((sum, report) => sum + report.total, 0);

        res.json({
            data: financialReports,
            count: count,
            metadata: { total: count },
            grandTotal: grandTotal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


exports.getShareholderReportExport = async (req, res) => {
    try {
        const { year, membersCode, fName, lName, civilId, gender, area, format } = req.query;
        const queryConditions = { status: 0 };

        // Construct query conditions
        if (year) queryConditions.year = year;
        if (membersCode) queryConditions.membersCode = membersCode;
        if (fName) queryConditions.fName = fName;
        if (lName) queryConditions.lName = lName;
        if (civilId) queryConditions.civilId = civilId;
        // if (status) queryConditions.status = status;
        if (gender) queryConditions.gender = gender;
        if (area) queryConditions.Area = area;

        // Retrieve all shareholders from the database with populated fields
        const shareholders = await Shareholder.find(queryConditions)
            .populate('share')
            .populate({ path: 'savings', populate: { path: 'amanat', model: 'Amanat' } });

        // Prepare an array to store the financial reporting for each shareholder
        const financialReports = await Promise.all(shareholders.map(async shareholder => {
            const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

            // Calculate the share increase and current amount
            let shareIncrease = 0;
            let shareCurrentAmount = 0;
            if (share && share.purchases) {
                share.purchases.forEach(purchase => {
                    shareIncrease += purchase.currentAmount - purchase.initialAmount;
                });
                shareCurrentAmount = share.totalAmount;
            }

            // Calculate the savings increase and current amount
            let savingsIncrease = savings ? savings.savingsIncrease : 0;
            let savingsCurrentAmount = savings ? savings.totalAmount : 0;

            // Calculate the amanat amount
            let amanatAmount = 0;
            if (savings && savings.amanat) {
                amanatAmount = savings.amanat.amount;
            }

            // Calculate the total
            const total = savingsCurrentAmount + amanatAmount;

            // Fetch withdrawal history for this shareholder
            const withdrawalHistories = await TransferLog.find({
                shareholder: _id,
                transferType: 'Savings'
            });

            // Calculate transferSavings
            const transferSavings = withdrawalHistories.reduce((total, history) => {
                return (history.amount || 0);
            }, 0);

            // Prepare the financial reporting object for the shareholder
            return {
                membersCode,
                civilId,
                fullName: `${fName} ${lName}`,
                shareIncrease,
                shareCurrentAmount,
                savingsIncrease,
                savingsCurrentAmount,
                amanatAmount,
                total,
                transferSavings
            };
        }));

        // Prepare the workbook and worksheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Shareholder Report');

        // Add headers
        worksheet.addRow([
            'Members Code', 'Full Name', 'Share Increase', 'Share Current Amount',
            'Savings Increase', 'Savings Current Amount', 'Amanat Amount', 'Total', 'Transfer Savings'
        ]);

        // Add data rows
        financialReports.forEach(report => {
            worksheet.addRow([
                report.membersCode,
                report.fullName,
                report.shareIncrease,
                report.shareCurrentAmount,
                report.savingsIncrease,
                report.savingsCurrentAmount,
                report.amanatAmount,
                report.savingsCurrentAmount,
                report.transferSavings
            ]);
        });

        // Set content type and disposition based on format
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=shareholder_report.csv');
            await workbook.csv.write(res);
        } else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=shareholder_report.xlsx');
            await workbook.xlsx.write(res);
        }

        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getAllShareholderByYear = async (req, res) => {
    try {
        // Pagination setup
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        // Extract year from query
        const year = parseInt(req.query.year) || new Date().getFullYear();
        if (!year) {
            return res.status(400).send({ message: "Year is required." });
        }

        // Setting up the date range for the query
        const startDate = new Date(year, 0, 1); // January 1 of the year
        const endDate = new Date(year + 1, 0, 1); // January 1 of the next year

        // Query to find shareholders by join date within the year
        const queryConditions = {
            joinDate: {
                $gte: startDate,
                $lt: endDate
            },
            status: 0
        };

        // Execute the query with pagination
        const shareholders = await Shareholder.find(queryConditions).populate('share').populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        })
            .populate({
                path: 'share',
                // match: { year: year }
            })
            .skip(skip)
            .limit(resultsPerPage);

        console.log(shareholders)
        const count = shareholders.length;
        // Prepare an array to store the financial reporting for each shareholder
        // Prepare an array to store the financial reporting for each shareholder
        const financialReports = await Promise.all(shareholders.map(async shareholder => {
            const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

            // Calculate the share increase and current amount
            let shareIncrease = 0;
            let shareCurrentAmount = 0;
            if (share && share.purchases) {
                share.purchases.forEach(purchase => {
                    shareIncrease += purchase.currentAmount - purchase.initialAmount;
                });
                shareCurrentAmount = share.totalAmount;
            }

            // Calculate the savings increase and current amount
            let savingsIncrease = savings ? savings.savingsIncrease : 0;
            let savingsCurrentAmount = savings ? savings.totalAmount : 0;

            // Calculate the amanat amount
            let amanatAmount = 0;
            if (savings && savings.amanat) {
                amanatAmount = savings.amanat.amount;
            }

            // Calculate the total
            const total = shareCurrentAmount + savingsCurrentAmount + amanatAmount;

            // Fetch withdrawal history for this shareholder
            const withdrawalHistories = await TransferLog.find({
                shareholder: _id,
                transferType: 'Savings'
            });

            // Calculate transferSavings
            const transferSavings = withdrawalHistories.reduce((total, history) => {
                return (history.amount || 0);
            }, 0);
            // Prepare the financial reporting object for the shareholder
            return {
                _id,
                membersCode,
                civilId,
                savingsDetails: savings || {},
                shareDetails: share || {},
                fullName: `${fName} ${lName}`,
                shareIncrease,
                shareCurrentAmount,
                savingsIncrease,
                savingsCurrentAmount,
                amanatAmount,
                total,
                transferSavings
            };
        }));
        res.status(200).send({
            data: financialReports,
            count: count,
            metadata: { total: count }
        });
    } catch (err) {
        console.error('Aggregation error:', err);
        res.status(500).send({ message: err.message });
    }
};
exports.getShareholderFinancialReport = async (req, res) => {
    try {
        const id = req.params.id;
        const shareholder = await Shareholder.find({ _id: id }).populate('share').populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        });
        res.status(200).send({
            data: shareholder
        })
    } catch (err) {
        console.error('Aggregation error:', err);
        res.status(500).send({ message: err.message });
    }
}
exports.getAllQuitShareholderByYear = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        const year = parseInt(req.query.year) || new Date().getFullYear();
        if (!year) {
            return res.status(400).send({ message: "Year is required." });
        }

        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year + 1, 0, 1);

        const queryConditions = {
            quitDate: {
                $gte: startDate,
                $lt: endDate
            },
            status: 0
        };

        const shareholders = await Shareholder.find(queryConditions).populate('share').populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        })
            .populate({
                path: 'share',
            })
            .skip(skip)
            .limit(resultsPerPage);

        // Count total documents matching the query
        const count = shareholders.length;
        // Prepare an array to store the financial reporting for each shareholder
        const financialReports = await Promise.all(shareholders.map(async shareholder => {
            const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

            // Calculate the share increase and current amount
            let shareIncrease = 0;
            let shareCurrentAmount = 0;
            if (share && share.purchases) {
                share.purchases.forEach(purchase => {
                    shareIncrease += purchase.currentAmount - purchase.initialAmount;
                });
                shareCurrentAmount = share.totalAmount;
            }

            // Calculate the savings increase and current amount
            let savingsIncrease = savings ? savings.savingsIncrease : 0;
            let savingsCurrentAmount = savings ? savings.totalAmount : 0;

            // Calculate the amanat amount
            let amanatAmount = 0;
            if (savings && savings.amanat) {
                amanatAmount = savings.amanat.amount;
            }

            // Calculate the total
            const total = shareCurrentAmount + savingsCurrentAmount + amanatAmount;

            // Fetch withdrawal history for this shareholder
            const withdrawalHistories = await TransferLog.find({
                shareholder: _id,
                transferType: 'Savings'
            });

            // Calculate transferSavings
            const transferSavings = withdrawalHistories.reduce((total, history) => {
                return (history.amount || 0);
            }, 0);
            // Prepare the financial reporting object for the shareholder
            return {
                _id,
                membersCode,
                civilId,
                savingsDetails: savings || {},
                shareDetails: share || {},
                fullName: `${fName} ${lName}`,
                shareIncrease,
                shareCurrentAmount,
                savingsIncrease,
                savingsCurrentAmount,
                amanatAmount,
                total,
                transferSavings
            };
        }));

        res.status(200).send({
            data: financialReports,
            count: count,
            metadata: { total: count }
        });
    } catch (err) {
        console.error('Aggregation error:', err);
        res.status(500).send({ message: err.message });
    }
};
exports.getAllShareholdersByWorkplace = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const workplace = req.query.workplace;
        const queryConditions = {
            workplace: workplace,
            status: 0
        };
        console.log(queryConditions);
        const shareholders = await Shareholder.find(queryConditions).populate('share').populate({
            path: 'savings',
            populate: {
                path: 'amanat',
                model: 'Amanat'
            }
        })
            .populate({
                path: 'share',
            })
            .skip(skip)
            .limit(resultsPerPage);

        // Count total documents matching the query
        const count = shareholders.length;
        // Prepare an array to store the financial reporting for each shareholder
        const financialReports = await Promise.all(shareholders.map(async shareholder => {
            const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

            // Calculate the share increase and current amount
            let shareIncrease = 0;
            let shareCurrentAmount = 0;
            if (share && share.purchases) {
                share.purchases.forEach(purchase => {
                    shareIncrease += purchase.currentAmount - purchase.initialAmount;
                });
                shareCurrentAmount = share.totalAmount;
            }

            // Calculate the savings increase and current amount
            let savingsIncrease = savings ? savings.savingsIncrease : 0;
            let savingsCurrentAmount = savings ? savings.totalAmount : 0;

            // Calculate the amanat amount
            let amanatAmount = 0;
            if (savings && savings.amanat) {
                amanatAmount = savings.amanat.amount;
            }

            // Calculate the total
            const total = shareCurrentAmount + savingsCurrentAmount + amanatAmount;

            // Fetch withdrawal history for this shareholder
            const withdrawalHistories = await TransferLog.find({
                shareholder: _id,
                transferType: 'Savings'
            });

            // Calculate transferSavings
            const transferSavings = withdrawalHistories.reduce((total, history) => {
                return (history.amount || 0);
            }, 0);
            // Prepare the financial reporting object for the shareholder
            return {
                _id,
                membersCode,
                civilId,
                savingsDetails: savings || {},
                shareDetails: share || {},
                fullName: `${fName} ${lName}`,
                shareIncrease,
                shareCurrentAmount,
                savingsIncrease,
                savingsCurrentAmount,
                amanatAmount,
                total,
                transferSavings
            };
        }));
        res.status(200).send({
            data: financialReports,
            count: count,
            metadata: { total: count }
        });


    } catch (err) {
        console.error('Aggregation error:', err);
        res.status(500).send({ message: err.message });
    }
}
exports.getShareholderReport = async (req, res) => {
    try {
        const { id } = req.params;

        // Retrieve the shareholder from the database with populated fields
        const shareholder = await Shareholder.findById(id)
            .populate('share')
            .populate({ path: 'savings', populate: { path: 'amanat', model: 'Amanat' } });

        if (!shareholder) {
            return res.status(404).json({ error: 'Shareholder not found' });
        }

        const { _id, membersCode, civilId, fName, lName, share, savings } = shareholder;

        // Calculate the share increase and current amount
        let shareIncrease = 0;
        let shareCurrentAmount = 0;
        if (share && share.purchases) {
            share.purchases.forEach(purchase => {
                shareIncrease += purchase.currentAmount - purchase.initialAmount;
            });
            shareCurrentAmount = share.totalAmount;
        }

        // Get the savings increase directly from the savings record
        let savingsIncrease = savings ? savings.savingsIncrease : 0;
        let savingsCurrentAmount = savings ? savings.totalAmount : 0;

        // Calculate the amanat amount
        let amanatAmount = 0;
        if (savings && savings.amanat) {
            amanatAmount = savings.amanat.amount;
        }

        // Calculate the total
        const total = savingsCurrentAmount + amanatAmount + savingsIncrease;

        // Fetch withdrawal history for this shareholder
        const withdrawalHistories = await TransferLog.find({
            shareholder: _id,
            transferType: 'Savings'
        });

        // Calculate transferSavings
        const transferSavings = withdrawalHistories.reduce((total, history) => {
            return (history.amount || 0);
        }, 0);

        // Prepare the financial reporting object for the shareholder
        const financialReport = {
            _id,
            membersCode,
            civilId,
            savingsDetails: savings || {},
            shareDetails: share || {},
            fullName: `${fName} ${lName}`,
            shareIncrease,
            shareCurrentAmount,
            savingsIncrease,
            savingsCurrentAmount,
            amanatAmount,
            total,
            transferSavings
        };

        res.json({
            data: [financialReport],
            metadata: { total: 1 },
            grandTotal: total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};