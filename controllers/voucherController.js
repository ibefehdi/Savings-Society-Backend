const Voucher = require('../models/voucherSchema');
const Transaction = require('../models/transactionSchema');
const Tenant = require('../models/tenantSchema');
const excel = require('exceljs');

exports.getAllVouchers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
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
exports.createVoucher = async (req, res) => {
    try {
        const { buildingId, flatId, tenantId, amount, pendingDate, paidDate, status } = req.body;

        const voucherData = {
            buildingId,
            flatId,
            tenantId,
            amount,
            status,
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
                description: `Voucher Paid By ${tenant.name}`,
            };

            await Transaction.create(transactionData);
        }

        res.status(201).json(createdVoucher);
    } catch (error) {
        console.error('Error creating voucher:', error);
        res.status(500).json({ error: 'An error occurred while creating the voucher' });
    }
};


exports.getVoucherReportExport = async (req, res) => {
    try {
        const { status, format } = req.query;
        let queryConditions = {};

        // Construct query conditions
        if (status) queryConditions.status = status;

        // Retrieve all vouchers from the database with populated fields
        const vouchers = await Voucher.find(queryConditions)
            .populate('buildingId')
            .populate('flatId')
            .populate('tenantId');

        // Prepare an array to store the voucher report data
        const reportData = vouchers.map(voucher => {
            return {
                buildingNo: voucher.buildingId.no,
                buildingName: voucher.buildingId.name,
                flatNumber: voucher.flatId.flatNumber,
                floorNumber: voucher.flatId.floorNumber,
                tenantName: voucher.tenantId.name,
                contactNumber: voucher.tenantId.contactNumber,
                civilId: voucher.tenantId.civilId,
                amount: voucher.amount,
                pendingDate: voucher.pendingDate ? voucher.pendingDate.toISOString().split('T')[0] : 'N/A',
                paidDate: voucher.paidDate ? voucher.paidDate.toISOString().split('T')[0] : 'N/A',
                status: voucher.status
            };
        });

        // Prepare the workbook and worksheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Voucher Report');

        // Add headers in Arabic
        worksheet.addRow([
            'رقم المبنى', 'اسم المبنى', 'رقم الشقة', 'رقم الطابق', 'اسم المستأجر', 'رقم الاتصال', 'الرقم المدني', 'المبلغ', 'تاريخ الاستحقاق', 'تاريخ الدفع', 'الحالة'
        ]);

        // Add data rows
        reportData.forEach(record => {
            worksheet.addRow([
                record.buildingNo,
                record.buildingName,
                record.flatNumber,
                record.floorNumber,
                record.tenantName,
                record.contactNumber,
                record.civilId,
                record.amount,
                record.pendingDate,
                record.paidDate,
                record.status
            ]);
        });

        // Set content type and disposition based on format
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=voucher_report.csv');
            await workbook.csv.write(res);
        } else {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=voucher_report.xlsx');
            await workbook.xlsx.write(res);
        }
        res.write('\uFEFF');  // UTF-8 BOM

        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};