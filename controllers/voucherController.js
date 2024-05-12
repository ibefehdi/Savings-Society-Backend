const Voucher = require('../models/voucherSchema');
const Transaction = require('../models/transactionSchema');
exports.getAllVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find()
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId',
                    model: 'Building',
                },
            })
            .populate('tenantId')
            .populate('buildingId');

        const count = vouchers.length;

        res.status(200).json({
            data: vouchers,
            count: count,
            metadata: {
                total: count,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getPendingVouchers = async (req, res) => {
    try {
        const pendingVouchers = await Voucher.find({ status: 'Pending' }).populate({
            path: 'flatId',
            populate: {
                path: 'buildingId',
                model: 'Building',
            },
        })
            .populate('tenantId');
        const count = pendingVouchers.length;

        res.status(200).json({
            data: pendingVouchers,
            count: count,
            metadata: {
                total: count,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getPaidVouchers = async (req, res) => {
    try {
        const paidVouchers = await Voucher.find({ status: 'Paid' }).populate({
            path: 'flatId',
            populate: {
                path: 'buildingId',
                model: 'Building',
            },
        })
            .populate('tenantId');
        const count = paidVouchers.length;

        res.status(200).json({
            data: paidVouchers,
            count: count,
            metadata: {
                total: count,
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.payVoucher = async (req, res) => {
    try {
        const id = req.params.id;
        const date = req.body.date;
        const voucher = await Voucher.findByIdAndUpdate(id, { status: 'Paid', paidDate: date }, { new: true }).populate({
            path: 'flatId',
            populate: {
                path: 'buildingId',
                model: 'Building',
            },
        }).populate('tenantId');
        if (!voucher) {
            return res.status(404).json({ status: 'Not Found', message: "Voucher not found" });
        }
        const transaction = new Transaction({
            buildingId: voucher?.buildingId,
            flatId: voucher?.flatId,
            bookingId: voucher?.flatId,
            amount: voucher?.amount,
            date: date,
            type: "Income",
            transactionFrom: voucher?.flatId ? "Flat" : "Hall",
            description: `Voucher Paid By ${voucher?.tenantId?.name}`,
        });
        transaction.save();
        res.status(200).json({ status: 'OK', message: "Voucher Paid successfully", amount: voucher.amount });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}