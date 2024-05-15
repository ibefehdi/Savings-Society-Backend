const Contract = require('../models/contractSchema')
const ContractHistory = require('../models/contractHistorySchema')
exports.getAllContracts = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;
        const query = {};

        if (req.query.expired !== undefined) {
            if (req.query.expired === 'true') {
                // Retrieve expired contracts from ContractHistory model
                const contracts = await ContractHistory.find()
                    .populate('flatId tenantId')
                    .skip(skip)
                    .limit(resultsPerPage);
                const count = await ContractHistory.countDocuments();

                res.status(200).json({
                    data: contracts,
                    count: count,
                    metadata: { total: count },
                });
            } else {
                // Retrieve non-expired contracts from Contract model
                query.expired = false;
                const contracts = await Contract.find(query)
                    .populate('flatId tenantId')
                    .skip(skip)
                    .limit(resultsPerPage);
                const count = await Contract.countDocuments(query);

                res.status(200).json({
                    data: contracts,
                    count: count,
                    metadata: { total: count },
                });
            }
        } else {
            // Retrieve all contracts (expired and non-expired) from both models
            const contracts = await Contract.find(query)
                .populate('flatId tenantId')
                .skip(skip)
                .limit(resultsPerPage);
            const contractHistory = await ContractHistory.find()
                .populate('flatId tenantId')
                .skip(skip)
                .limit(resultsPerPage);

            const allContracts = [...contracts, ...contractHistory];
            const count = await Contract.countDocuments(query) + await ContractHistory.countDocuments();

            res.status(200).json({
                data: allContracts,
                count: count,
                metadata: { total: count },
            });
        }
    } catch (error) {
        res.status(500).json({
            message: 'An error occurred while fetching contracts',
            error: error.message,
        });
    }
};