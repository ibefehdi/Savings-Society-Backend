const Voucher = require('../models/voucherSchema');
const Transaction = require('../models/transactionSchema');
const Tenant = require('../models/tenantSchema');
const Building = require('../models/buildingSchema');
const excel = require('exceljs');
const { stringify } = require('csv-stringify');
const moment = require('moment');
const mongoose = require('mongoose');
const Excel = require('exceljs');

exports.getAllVouchers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        // Create a match object for filtering
        let match = {};

        if (req.query.buildingId) {
            try {
                match.buildingId = new mongoose.Types.ObjectId(req.query.buildingId);
            } catch (error) {
                console.error('Invalid buildingId format:', req.query.buildingId);
                return res.status(400).json({ error: 'Invalid buildingId format' });
            }

            // Verify if the building exists
            const building = await Building.findById(match.buildingId);
            if (!building) {
                console.log('Building not found:', req.query.buildingId);
                return res.status(404).json({ error: 'Building not found' });
            }
        }

        if (req.query.tenantName) {
            match['tenantId.name'] = { $regex: req.query.tenantName, $options: 'i' };
        }

        if (req.query.civilId) {
            match['tenantId.civilId'] = { $regex: req.query.civilId, $options: 'i' };
        }

        if (req.query.contactNumber) {
            match['tenantId.contactNumber'] = { $regex: req.query.contactNumber, $options: 'i' };
        }
        if (req.query.amount) {
            const amount = parseFloat(req.query.amount);
            if (!isNaN(amount)) {
                match.amount = amount;
            } else {
                console.error('Invalid amount format:', req.query.amount);
                return res.status(400).json({ error: 'Invalid amount format' });
            }
        }
        console.log('Match object:', JSON.stringify(match));

        const pipeline = [
            { $match: match },
            {
                $lookup: {
                    from: 'flats',
                    localField: 'flatId',
                    foreignField: '_id',
                    as: 'flatId'
                }
            },
            { $unwind: '$flatId' },
            {
                $lookup: {
                    from: 'buildings',
                    localField: 'flatId.buildingId',
                    foreignField: '_id',
                    as: 'flatId.buildingId'
                }
            },
            { $unwind: '$flatId.buildingId' },
            {
                $lookup: {
                    from: 'tenants',
                    localField: 'tenantId',
                    foreignField: '_id',
                    as: 'tenantId'
                }
            },
            { $unwind: '$tenantId' },
            {
                $lookup: {
                    from: 'buildings',
                    localField: 'buildingId',
                    foreignField: '_id',
                    as: 'buildingId'
                }
            },
            { $unwind: '$buildingId' },
            {
                $facet: {
                    metadata: [
                        { $count: 'total' },
                        { $addFields: { page: page, resultsPerPage: resultsPerPage } }
                    ],
                    data: [
                        { $sort: { voucherNo: -1 } },
                        { $skip: skip },
                        { $limit: resultsPerPage }
                    ]
                }
            }
        ];

        console.log('Aggregation Pipeline:', JSON.stringify(pipeline, null, 2));

        const result = await Voucher.aggregate(pipeline);

        console.log('Aggregation result:', JSON.stringify(result, null, 2));

        const vouchers = result[0].data;
        const metadata = result[0].metadata[0] || { total: 0, page, resultsPerPage };

        if (vouchers.length === 0) {
            console.log('No vouchers found for the given criteria');
        }

        res.status(200).json({
            data: vouchers,
            count: metadata.total,
            metadata: metadata
        });
    } catch (error) {
        console.error('Error in getAllVouchers:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getVouchersByFlatId = async (req, res) => {
    try {
        const { flatId } = req.params;
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        const vouchers = await Voucher.find({ flatId })
            .populate('tenantId').populate('buildingId').populate('flatId')
            .sort({ date: -1 })
            .skip(skip)
            .limit(resultsPerPage);

        const count = await Voucher.countDocuments({ flatId });

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
        console.error('Error in getVouchersByFlatId:', error);
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

        // Validation
        const errors = {};
        if (!buildingId) errors.buildingId = 'Building is required';
        if (!flatId) errors.flatId = 'Flat is required';
        if (!tenantId) errors.tenantId = 'Tenant is required';
        if (!amount) errors.amount = 'Amount is required';
        if (!pendingDate) errors.pendingDate = 'Pending date is required';
        if (!status) errors.status = 'Status is required';
        if (!voucherNo) errors.voucherNo = 'Voucher number is required';

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ errors });
        }

        // Check if a voucher already exists for the same tenant, flat, and month
        const existingVoucherQuery = {
            buildingId,
            flatId,
            tenantId,
            pendingDate: {
                $gte: new Date(pendingDate).setDate(1),
                $lt: new Date(pendingDate).setMonth(new Date(pendingDate).getMonth() + 1)
            }
        };

        // Only add paidDate to the query if it's a non-empty string
        if (paidDate && paidDate.trim() !== '') {
            existingVoucherQuery.$or = [
                { pendingDate: existingVoucherQuery.pendingDate },
                {
                    paidDate: {
                        $gte: new Date(paidDate).setDate(1),
                        $lt: new Date(paidDate).setMonth(new Date(paidDate).getMonth() + 1)
                    }
                }
            ];
        }

        const existingVoucher = await Voucher.findOne(existingVoucherQuery);

        if (existingVoucher) {
            return res.status(400).json({ error: 'A voucher already exists for this month', existingVoucher });
        }

        const voucherData = {
            buildingId,
            flatId,
            tenantId,
            amount,
            status,
            voucherNo,
            pendingDate: new Date(pendingDate)
        };

        // Only add paidDate if it's a non-empty string
        if (paidDate && paidDate.trim() !== '') {
            voucherData.paidDate = new Date(paidDate);
        }

        const [tenant, createdVoucher] = await Promise.all([
            Tenant.findById(tenantId),
            Voucher.create(voucherData),
        ]);

        res.status(201).json(createdVoucher);
    } catch (error) {
        console.error('Error creating voucher:', error);
        res.status(500).json({ error: 'An error occurred while creating the voucher', details: error.message });
    }
};

exports.deleteVoucher = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id)
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
        // Filter logic (kept as is)
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

        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Vouchers');

        worksheet.columns = [
            { header: 'رقم الايصال', key: 'voucherNo', width: 15 },
            { header: 'اسم المبنى', key: 'buildingName', width: 20 },
            { header: 'رقم الشقة', key: 'flatNumber', width: 15 },
            { header: 'اسم المستأجر', key: 'tenantName', width: 20 },
            { header: 'الرقم المدني', key: 'civilId', width: 15 },
            { header: 'رقم الاتصال', key: 'contactNumber', width: 15 },
            { header: 'المبلغ', key: 'amount', width: 15 },
            { header: 'تاريخ الاستحقاق', key: 'pendingDate', width: 20 },
            { header: 'تاريخ الدفع', key: 'paidDate', width: 20 },
            { header: 'الحالة', key: 'status', width: 15 }
        ];

        // Style for the header row
        worksheet.getRow(1).font = { bold: true };

        const formatDate = (date) => {
            return date ? new Date(date) : null;
        };

        vouchers.forEach((voucher) => {
            worksheet.addRow({
                voucherNo: voucher.voucherNo || 'N/A',
                buildingName: voucher.buildingId ? voucher.buildingId.name : 'N/A',
                flatNumber: voucher.flatId ? voucher.flatId.flatNumber : 'N/A',
                tenantName: voucher.tenantId ? voucher.tenantId.name : 'N/A',
                civilId: voucher.tenantId ? voucher.tenantId.civilId : 'N/A',
                contactNumber: voucher.tenantId ? voucher.tenantId.contactNumber : 'N/A',
                amount: voucher.amount,
                pendingDate: formatDate(voucher.pendingDate),
                paidDate: formatDate(voucher.paidDate),
                status: voucher.status
            });
        });

        // Apply number format to amount column
        worksheet.getColumn('amount').numFmt = '#,##0.000';

        // Apply date format to date columns
        worksheet.getColumn('pendingDate').numFmt = 'dd/mm/yyyy';
        worksheet.getColumn('paidDate').numFmt = 'dd/mm/yyyy';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="vouchers.xlsx"');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error in getAllVouchersFormatted:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getVouchersByFlatIdFormatted = async (req, res) => {
    try {
        const { flatId } = req.params;

        const vouchers = await Voucher.find({ flatId })
            .populate({
                path: 'flatId',
                populate: {
                    path: 'buildingId',
                    model: 'Building',
                },
            })
            .populate('tenantId')
            .populate('buildingId')
            .sort({ pendingDate: 1 }); // Sort by pending date ascending

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
        res.setHeader('Content-Disposition', `attachment; filename="vouchers_flat_${flatId}.csv"`);
        res.write('\uFEFF');  // UTF-8 BOM
        csvStringifier.pipe(res);

        vouchers.forEach((voucher) => {
            const row = {
                'رقم الايصال': voucher.voucherNo || 'N/A',
                'اسم المبنى': voucher.flatId.buildingId ? voucher.flatId.buildingId.name : 'N/A',
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
        console.error('Error in getVouchersByFlatIdFormatted:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};