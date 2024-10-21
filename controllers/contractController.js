const Contract = require('../models/contractSchema')
const ContractHistory = require('../models/contractHistorySchema')
const Flat = require('../models/flatSchema');
const Tenant = require('../models/tenantSchema');
const { stringify } = require('csv-stringify');
const moment = require('moment');
const ExcelJS = require('exceljs');

exports.getAllContracts = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        // Build the filter object
        const filter = {};

        if (req.query.startDate || req.query.endDate) {
            filter.startDate = {};
            if (req.query.startDate) {
                filter.startDate.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.startDate.$lte = new Date(req.query.endDate);
            }
        }

        if (req.query.rentAmount) {
            filter.rentAmount = parseFloat(req.query.rentAmount);
        }

        // Find the flat ID based on flatNumber if flatId query is provided
        if (req.query.flatId) {
            const flat = await Flat.findOne({ flatNumber: req.query.flatId });
            if (flat) {
                filter.flatId = flat._id;
            } else {
                // If no flat found with the given number, return empty result
                return res.status(200).json({
                    data: [],
                    count: 0,
                    metadata: {
                        total: 0,
                        page: page,
                        resultsPerPage: resultsPerPage,
                        totalPages: 0
                    },
                });
            }
        }

        // Find the tenant ID based on name if tenantId query is provided
        if (req.query.tenantId) {
            const tenant = await Tenant.findOne({ name: new RegExp(req.query.tenantId, 'i') });
            if (tenant) {
                filter.tenantId = tenant._id;
            } else {
                // If no tenant found with the given name, return empty result
                return res.status(200).json({
                    data: [],
                    count: 0,
                    metadata: {
                        total: 0,
                        page: page,
                        resultsPerPage: resultsPerPage,
                        totalPages: 0
                    },
                });
            }
        }

        const [contracts, totalCount] = await Promise.all([
            Contract.find(filter)
                .sort({ expired: -1, startDate: -1 })
                .skip(skip)
                .limit(resultsPerPage)
                .populate('flatId')
                .populate('tenantId')
                .lean(),
            Contract.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / resultsPerPage);

        res.status(200).json({
            data: contracts,
            count: totalCount,
            metadata: {
                total: totalCount,
                page: page,
                resultsPerPage: resultsPerPage,
                totalPages: totalPages
            },
        });
    } catch (error) {
        console.error('Error in getAllContracts:', error);
        res.status(500).json({
            message: 'An error occurred while fetching all contracts',
            error: error.message,
        });
    }
};
exports.getContractsCSV = async (req, res) => {
    try {
        const { status } = req.query; // 'active' or 'inactive'
        let contracts;

        if (status === 'active') {
            contracts = await Contract.find({ expired: false })
                .populate('flatId tenantId')
                .sort({ startDate: -1 })
                .lean();
        } else if (status === 'inactive') {
            contracts = await ContractHistory.find()
                .populate('flatId tenantId')
                .sort({ startDate: -1 })
                .lean();
        } else {
            return res.status(400).json({ message: "Invalid status parameter" });
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Contracts');

        worksheet.columns = [
            { header: 'رقم الشقة', key: 'flatNumber', width: 15 },
            { header: 'اسم المستأجر', key: 'tenantName', width: 20 },
            { header: 'تاريخ البدء', key: 'startDate', width: 15 },
            { header: 'تاريخ الانتهاء', key: 'endDate', width: 15 },
            { header: 'قيمة الإيجار', key: 'rentAmount', width: 15 },
            { header: 'الحالة', key: 'status', width: 15 },
            { header: 'يوم التحصيل', key: 'collectionDay', width: 15 }
        ];

        // Function to format date as dd/mm/yyyy
        const formatDate = (date) => {
            if (!date) return 'N/A';
            return moment(date).format('DD/MM/YYYY');
        };

        let totalRentAmount = 0;

        // Add data rows
        contracts.forEach((contract) => {
            const rentAmount = contract.rentAmount || 0;
            totalRentAmount += rentAmount;

            worksheet.addRow({
                flatNumber: contract.flatId ? contract.flatId.flatNumber : 'N/A',
                tenantName: contract.tenantId ? contract.tenantId.name : 'N/A',
                startDate: formatDate(contract.startDate),
                endDate: formatDate(contract.endDate),
                rentAmount: rentAmount,
                status: status === 'active' ? 'نشط' : 'غير نشط',
                collectionDay: contract.collectionDay || 'N/A'
            });
        });

        // Add total row
        worksheet.addRow({
            flatNumber: '',
            tenantName: '',
            startDate: '',
            endDate: '',
            rentAmount: totalRentAmount,
            status: 'المجموع الكلي',
            collectionDay: ''
        });

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Style the total row
        const lastRow = worksheet.lastRow;
        lastRow.font = { bold: true };
        lastRow.getCell('status').alignment = { horizontal: 'right' };
        lastRow.getCell('rentAmount').alignment = { horizontal: 'left' };

        // Set text direction for the entire sheet to RTL
        worksheet.views = [
            { rightToLeft: true }
        ];

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="contracts.xlsx"');
        res.send(buffer);
    } catch (error) {
        console.error("Error exporting contracts to XLSX:", error);
        res.status(500).json({ message: "Error exporting contracts to XLSX", error: error.message });
    }
};
exports.getActiveContracts = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        // Build the filter object
        const filter = { expired: false };

        // Create separate filter for populating
        const populateFilter = {};

        if (req.query.flatId) {
            populateFilter.flatId = {
                $expr: {
                    $regexMatch: {
                        input: { $toString: "$flatId.flatNumber" },
                        regex: req.query.flatId,
                        options: "i"
                    }
                }
            };
        }

        if (req.query.tenantName) {
            populateFilter.tenantId = {
                $expr: {
                    $regexMatch: {
                        input: "$tenantId.name",
                        regex: req.query.tenantName,
                        options: "i"
                    }
                }
            };
        }

        if (req.query.startDate || req.query.endDate) {
            filter.startDate = {};
            if (req.query.startDate) {
                filter.startDate.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.startDate.$lte = new Date(req.query.endDate);
            }
        }

        if (req.query.rentAmount) {
            filter.rentAmount = parseFloat(req.query.rentAmount);
        }

        console.log('Filter:', filter);
        console.log('Populate Filter:', populateFilter);

        const [contracts, totalCount] = await Promise.all([
            Contract.find(filter)
                .populate({
                    path: 'flatId',
                    match: populateFilter.flatId
                })
                .populate({
                    path: 'tenantId',
                    match: populateFilter.tenantId
                })
                .sort({ startDate: -1 })
                .then(contracts => contracts.filter(contract => contract.flatId && contract.tenantId))
                .then(contracts => contracts.slice(skip, skip + resultsPerPage)),
            Contract.find(filter)
                .populate({
                    path: 'flatId',
                    match: populateFilter.flatId
                })
                .populate({
                    path: 'tenantId',
                    match: populateFilter.tenantId
                })
                .then(contracts => contracts.filter(contract => contract.flatId && contract.tenantId))
                .then(contracts => contracts.length)
        ]);

        const totalPages = Math.ceil(totalCount / resultsPerPage);

        res.status(200).json({
            data: contracts,
            count: totalCount,
            metadata: {
                total: totalCount,
                page: page,
                resultsPerPage: resultsPerPage,
                totalPages: totalPages
            },
        });
    } catch (error) {
        console.error('Error in getActiveContracts:', error);
        res.status(500).json({
            message: 'An error occurred while fetching active contracts',
            error: error.message,
        });
    }
};

exports.getInactiveContracts = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        // Build the filter object
        const filter = {};

        if (req.query.flatId) {
            filter.flatId = req.query.flatId;
        }

        if (req.query.tenantId) {
            filter.tenantId = req.query.tenantId;
        }

        if (req.query.startDate || req.query.endDate) {
            filter.startDate = {};
            if (req.query.startDate) {
                filter.startDate.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                filter.startDate.$lte = new Date(req.query.endDate);
            }
        }

        if (req.query.rentAmount) {
            filter.rentAmount = parseFloat(req.query.rentAmount);
        }

        const [contracts, totalCount] = await Promise.all([
            ContractHistory.find(filter)
                .populate('flatId tenantId')
                .skip(skip)
                .limit(resultsPerPage)
                .sort({ startDate: -1 }),
            ContractHistory.countDocuments(filter)
        ]);

        const totalPages = Math.ceil(totalCount / resultsPerPage);

        res.status(200).json({
            data: contracts,
            count: totalCount,
            metadata: {
                total: totalCount,
                page: page,
                resultsPerPage: resultsPerPage,
                totalPages: totalPages
            },
        });
    } catch (error) {
        console.error('Error in getInactiveContracts:', error);
        res.status(500).json({
            message: 'An error occurred while fetching inactive contracts',
            error: error.message,
        });
    }
};
exports.deleteContract = async (req, res) => {
    try {
        const { id } = req.params;

        // Find the contract and delete it
        const deletedContract = await Contract.findByIdAndDelete(id);

        if (!deletedContract) {
            return res.status(404).json({ message: 'Contract not found' });
        }

        res.status(200).json({ message: 'Contract deleted successfully', deletedContract });
    } catch (error) {
        console.error('Error deleting contract:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
