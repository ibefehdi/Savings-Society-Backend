const Contract = require('../models/contractSchema')
const ContractHistory = require('../models/contractHistorySchema')
const { stringify } = require('csv-stringify');
const moment = require('moment');

exports.getAllContracts = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const query = {};

        if (req.query.expired !== undefined) {
            query.expired = req.query.expired === 'true';
        }

        // Count total documents
        const [activeCount, expiredCount] = await Promise.all([
            Contract.countDocuments({ ...query, expired: false }),
            ContractHistory.countDocuments(query)
        ]);

        const totalCount = activeCount + expiredCount;
        const totalPages = Math.ceil(totalCount / resultsPerPage);

        // Calculate skip for each collection
        const activeSkip = Math.max(0, Math.min(skip, activeCount));
        const expiredSkip = Math.max(0, skip - activeCount);

        // Fetch contracts from both Contract and ContractHistory models
        const [activeContracts, expiredContracts] = await Promise.all([
            Contract.find({ ...query, expired: false })
                .populate('flatId tenantId')
                .skip(activeSkip)
                .limit(resultsPerPage),
            ContractHistory.find(query)
                .populate('flatId tenantId')
                .skip(expiredSkip)
                .limit(resultsPerPage)
        ]);

        // Combine and sort the results
        const allContracts = [...activeContracts, ...expiredContracts]
            .sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

        // Slice the combined results to ensure we return the correct number
        const paginatedContracts = allContracts.slice(0, resultsPerPage);

        res.status(200).json({
            data: paginatedContracts,
            count: totalCount,
            metadata: {
                total: totalCount,
                page: page,
                resultsPerPage: resultsPerPage,
                totalPages: totalPages
            },
        });
    } catch (error) {
        res.status(500).json({
            message: 'An error occurred while fetching contracts',
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

        const [contracts, totalCount] = await Promise.all([
            Contract.find({ expired: false })
                .populate('flatId tenantId')
                .skip(skip)
                .limit(resultsPerPage)
                .sort({ startDate: -1 }),
            Contract.countDocuments({ expired: false })
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

        const [contracts, totalCount] = await Promise.all([
            ContractHistory.find()
                .populate('flatId tenantId')
                .skip(skip)
                .limit(resultsPerPage)
                .sort({ startDate: -1 }),
            ContractHistory.countDocuments()
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
        res.status(500).json({
            message: 'An error occurred while fetching inactive contracts',
            error: error.message,
        });
    }
};