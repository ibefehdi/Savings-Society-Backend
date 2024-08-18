const Voucher = require('../models/voucherSchema');
const Transaction = require('../models/transactionSchema');
const Tenant = require('../models/tenantSchema');
const excel = require('exceljs');
const { stringify } = require('csv-stringify');
const moment = require('moment');

exports.getAllVouchers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 0;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        // Create a filter object
        let filter = {};

        // Filter by building
        if (req.query.buildingId) {
            filter.buildingId = req.query.buildingId;
        }

        // Filter by tenant name
        if (req.query.tenantName) {
            filter['tenantId.name'] = { $regex: req.query.tenantName, $options: 'i' };
        }

        // Filter by civil ID
        if (req.query.civilId) {
            filter['tenantId.civilId'] = { $regex: req.query.civilId, $options: 'i' };
        }

        // Filter by contact number
        if (req.query.contactNumber) {
            filter['tenantId.contactNumber'] = { $regex: req.query.contactNumber, $options: 'i' };
        }

        const vouchers = await Voucher.find(filter)
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId',
                    model: 'Building',
                },
            })
            .populate('tenantId')
            .populate('buildingId')
            .skip(skip)
            .limit(resultsPerPage);

        const count = await Voucher.countDocuments(filter);

        res.status(200).json({
            data: vouchers,
            count: count,
            metadata: {
                total: count,
                page: page,
                resultsPerPage: resultsPerPage
            },
        });
    } catch (error) {
        console.error('Error in getAllVouchers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.editVoucher = async (req, res) => {
    try {
        const { id } = req.params;
        const { buildingId, flatId, tenantId, amount, pendingDate, paidDate, status, voucherNo } = req.body;

        const existingVoucher = await Voucher.findById(id);
        if (!existingVoucher) {
            return res.status(404).json({ error: 'Voucher not found' });
        }

        const voucherData = {
            buildingId,
            flatId,
            tenantId,
            amount,
            status,
            voucherNo
        };

        // Status logic
        if (status === 'Paid') {
            voucherData.paidDate = paidDate;
        } else if (status === 'Pending') {
            voucherData.pendingDate = pendingDate;
            voucherData.paidDate = null;
        } else if (status === 'Cancelled') {
            voucherData.pendingDate = null;
            voucherData.paidDate = null;
        }

        const updatedVoucher = await Voucher.findByIdAndUpdate(id, voucherData, { new: true });

        // Fetch tenant information
        const tenant = await Tenant.findById(tenantId);

        // Handle status transitions
        if (existingVoucher.status !== status) {
            switch (status) {
                case 'Paid':
                    if (existingVoucher.status === 'Pending') {
                        // Create a new transaction for Pending to Paid
                        await Transaction.create({
                            buildingId,
                            flatId,
                            amount,
                            date: paidDate,
                            type: "Income",
                            transactionFrom: flatId ? "Flat" : "Hall",
                            description: `Voucher ${voucherNo} Paid By ${tenant.name}`,
                        });
                    } else if (existingVoucher.status === 'Cancelled') {
                        // Create a new transaction for Cancelled to Paid
                        await Transaction.create({
                            buildingId,
                            flatId,
                            amount,
                            date: paidDate,
                            type: "Income",
                            transactionFrom: flatId ? "Flat" : "Hall",
                            description: `Cancelled Voucher ${voucherNo} Paid By ${tenant.name}`,
                        });
                    }
                    break;

                case 'Pending':
                    if (existingVoucher.status === 'Paid') {
                        // Delete the associated transaction for Paid to Pending
                        await Transaction.deleteOne({
                            buildingId,
                            flatId,
                            amount,
                            type: "Income",
                            transactionFrom: flatId ? "Flat" : "Hall",
                            description: { $regex: new RegExp(`Voucher ${voucherNo} Paid By ${tenant.name}`) }
                        });
                    }
                    break;
            }
        }

        res.status(200).json(updatedVoucher);
    } catch (error) {
        console.error('Error editing voucher:', error);
        res.status(500).json({ error: 'An error occurred while editing the voucher' });
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
        const { date, receiptNo } = req.body;

        const voucher = await Voucher.findByIdAndUpdate(
            id,
            {
                status: 'Paid',
                paidDate: date,
                receiptNo: receiptNo // Add the receipt number to the voucher
            },
            { new: true }
        ).populate({
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
            description: `Voucher ${voucher.voucherNo} Paid By ${voucher?.tenantId?.name} (Receipt: ${receiptNo})`,
        });

        await transaction.save();

        res.status(200).json({
            status: 'OK',
            message: "Voucher Paid successfully",
            amount: voucher.amount,
            voucherNo: voucher.voucherNo,
            receiptNo: voucher.receiptNo
        });
    } catch (error) {
        console.error('Error paying voucher:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
exports.createVoucher = async (req, res) => {
    try {
        const { buildingId, flatId, tenantId, amount, pendingDate, paidDate, status, voucherNo } = req.body;

        // Check if a voucher already exists for the same tenant, flat, and month
        const existingVoucher = await Voucher.findOne({
            buildingId,
            flatId,
            tenantId,
            $or: [
                { pendingDate: { $gte: new Date(pendingDate).setDate(1), $lt: new Date(pendingDate).setMonth(new Date(pendingDate).getMonth() + 1) } },
                { paidDate: { $gte: new Date(paidDate).setDate(1), $lt: new Date(paidDate).setMonth(new Date(paidDate).getMonth() + 1) } }
            ]
        });

        if (existingVoucher) {
            return res.status(400).json({ error: 'A voucher already exists for this tenant, flat, and month' });
        }

        const voucherData = {
            buildingId,
            flatId,
            tenantId,
            amount,
            status,
            voucherNo
        };

        if (status === 'Paid') {
            voucherData.paidDate = paidDate;
        } else {
            voucherData.pendingDate = pendingDate;
        }

        const [tenant, createdVoucher] = await Promise.all([
            Tenant.findById(tenantId),
            Voucher.create(voucherData),
        ]);

        if (status === 'Paid') {
            const transactionData = {
                buildingId,
                flatId,
                amount,
                date: paidDate,
                type: "Income",
                transactionFrom: flatId ? "Flat" : "Hall",
                description: `Voucher ${voucherNo} Paid By ${tenant.name}`,
            };

            await Transaction.create(transactionData);
        }

        res.status(201).json(createdVoucher);
    } catch (error) {
        console.error('Error creating voucher:', error);
        res.status(500).json({ error: 'An error occurred while creating the voucher' });
    }
};

exports.deleteVoucher = async (req, res) => {
    try {
        const id = req.params.id;
        await Voucher.deleteOne({ _id: id });
        res.status(200).json({ message: 'Voucher deleted successfully' });

    }
    catch (error) {
        console.error('Error creating voucher:', error);
        res.status(500).json({ error: 'An error occurred while creating the voucher' });
    }
}

exports.getAllVouchersFormatted = async (req, res) => {
    try {
        // Filter logic (keep as is)
        let filter = {};
        if (req.query.buildingId) {
            filter.buildingId = req.query.buildingId;
        }
        if (req.query.tenantName) {
            filter['tenantId.name'] = { $regex: req.query.tenantName, $options: 'i' };
        }
        if (req.query.civilId) {
            filter['tenantId.civilId'] = { $regex: req.query.civilId, $options: 'i' };
        }
        if (req.query.contactNumber) {
            filter['tenantId.contactNumber'] = { $regex: req.query.contactNumber, $options: 'i' };
        }

        const vouchers = await Voucher.find(filter)
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId',
                    model: 'Building',
                },
            })
            .populate('tenantId')
            .populate('buildingId');

        const csvStringifier = stringify({
            header: true,
            columns: [
                'رقم الايصال',
                'اسم المبنى',
                'رقم الشقة',
                'اسم المستأجر',
                'الرقم المدني',
                'رقم الاتصال',
                'المبلغ',
                'تاريخ الاستحقاق',
                'تاريخ الدفع',
                'الحالة'
            ]
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="vouchers.csv"');
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        vouchers.forEach((voucher) => {
            const row = {
                'رقم الايصال': voucher.voucherNo || 'N/A',
                'اسم المبنى': voucher.buildingId ? voucher.buildingId.name : 'N/A',
                'رقم الشقة': voucher.flatId ? voucher.flatId.flatNumber : 'N/A',
                'اسم المستأجر': voucher.tenantId ? voucher.tenantId.name : 'N/A',
                'الرقم المدني': voucher.tenantId ? voucher.tenantId.civilId : 'N/A',
                'رقم الاتصال': voucher.tenantId ? voucher.tenantId.contactNumber : 'N/A',
                'المبلغ': voucher.amount.toFixed(3),
                'تاريخ الاستحقاق': voucher.pendingDate ? moment(voucher.pendingDate).format('DD/MM/YYYY') : 'N/A',
                'تاريخ الدفع': voucher.paidDate ? moment(voucher.paidDate).format('DD/MM/YYYY') : 'N/A',
                'الحالة': voucher.status
            };

            csvStringifier.write(row);
        });

        csvStringifier.end();

    } catch (error) {
        console.error('Error in getAllVouchersFormatted:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};