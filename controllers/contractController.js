const Contract = require('../models/contractSchema')
const ContractHistory = require('../models/contractHistorySchema')
const Flat = require('../models/flatSchema');
const Tenant = require('../models/tenantSchema');
const { stringify } = require('csv-stringify');
const moment = require('moment');
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

        const csvStringifier = stringify({
            header: true,
            columns: [
                'رقم الشقة',
                'اسم المستأجر',
                'تاريخ البدء',
                'تاريخ الانتهاء',
                'قيمة الإيجار',
                'الحالة',
                'يوم التحصيل'
            ]
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="contracts.csv"');
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        contracts.forEach((contract) => {
            const row = {
                'رقم الشقة': contract.flatId ? contract.flatId.flatNumber : 'N/A',
                'اسم المستأجر': contract.tenantId ? contract.tenantId.name : 'N/A',
                'تاريخ البدء': moment(contract.startDate).format('YYYY-MM-DD'),
                'تاريخ الانتهاء': moment(contract.endDate).format('YYYY-MM-DD'),
                'قيمة الإيجار': contract.rentAmount || 'N/A',
                'الحالة': status === 'active' ? 'نشط' : 'غير نشط',
                'يوم التحصيل': contract.collectionDay || 'N/A'
            };

            csvStringifier.write(row);
        });

        csvStringifier.end();

    } catch (error) {
        console.error("Error exporting contracts to CSV:", error);
        res.status(500).json({ message: "Error exporting contracts to CSV", error: error.message });
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
