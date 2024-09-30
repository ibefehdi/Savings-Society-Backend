const ShareholderFinanceHistory = require('../models/shareholderFinanceHistorySchema');

const shareholderFinanceHistoryController = {
    // Get all ShareholderFinanceHistory records
    getAllShareholderFinanceHistory: async (req, res) => {
        try {
            const records = await ShareholderFinanceHistory.find()
                .populate('shareholder')
                .populate('share')
                .populate('savings');

            const total = await ShareholderFinanceHistory.countDocuments();
            res.status(200).send({
                data: records,
                count: total,
                metadata: { total: total }
            });

        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get ShareholderFinanceHistory by shareholder
    getByShareholderId: async (req, res) => {
        try {
            const { shareholderId } = req.params;
            const records = await ShareholderFinanceHistory.find({ shareholder: shareholderId })
                .populate('shareholder')
                .populate('share')
                .populate('savings');
            res.json({ data: records });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },

    // Get ShareholderFinanceHistory by year
    getByYear: async (req, res) => {
        try {
            const { year } = req.params;
            const records = await ShareholderFinanceHistory.find({ year: parseInt(year) })
                .populate('shareholder')
                .populate('share')
                .populate('savings');
            res.json({ data: records });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
};

module.exports = shareholderFinanceHistoryController;