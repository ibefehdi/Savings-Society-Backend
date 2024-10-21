const mongoose = require('mongoose');
const Booking = require('../models/bookingSchema');
const Tenant = require('../models/tenantSchema')
const Transaction = require('../models/transactionSchema');
const Building = require('../models/buildingSchema');
const Voucher = require('../models/voucherSchema')
const path = require('path');
const fs = require('fs');
const { stringify } = require('csv-stringify');
const ExcelJS = require('exceljs');
const moment = require('moment');
exports.makeABooking = async (req, res) => {
    try {
        const { hallId, date, startTime, endTime, rate, tenantName, tenantContactNumber, tenantCivilId, tenantType, dateOfEvent, voucherNo } = req.body;
        console.log(tenantName, tenantContactNumber, tenantCivilId, tenantType, dateOfEvent, voucherNo)
        console.log("Req Body: ", req.body)

        // Check if a booking already exists for the same day and time
        const existingBooking = await Booking.findOne({
            hallId,
            dateOfEvent: dateOfEvent,
            startTime: { $lte: endTime },
            endTime: { $gte: startTime },
            active: true
        });

        if (existingBooking && existingBooking.active) {
            return res.status(400).json({ message: 'An active booking already exists for the specified day and time' });
        }

        // Handle file upload
        let civilIdDocument = undefined;
        if (req.file) {
            const fileExtension = path.extname(req.file.originalname);
            const newFileName = `${tenantCivilId}${fileExtension}`;
            const newPath = path.join(path.dirname(req.file.path), newFileName);

            fs.renameSync(req.file.path, newPath);

            const fileUrl = `${req.protocol}://${req.get('host')}/uploads/civilIDs/${newFileName}`;

            civilIdDocument = {
                path: fileUrl,
                fileType: fileExtension.toLowerCase() === '.pdf' ? 'pdf' : 'image'
            };
        }

        // Create a new tenant
        const tenantData = {
            name: tenantName,
            contactNumber: tenantContactNumber,
            civilId: tenantCivilId,
            civilIdDocument: civilIdDocument,
            active: true
        };

        const tenant = await Tenant.create(tenantData);

        // Create a new voucher
        const voucher = new Voucher({
            buildingId: hallId,
            tenantId: tenant._id,
            amount: rate,
            paidDate: dateOfEvent,
            status: 'Paid',
            voucherNo: voucherNo
        });
        await voucher.save();

        // Create a new booking
        const booking = new Booking({
            hallId,
            date,
            dateOfEvent,
            startTime: "00:00",
            endTime: "23:59",
            rate,
            active: true,
            customer: tenant._id,
            voucher: voucher._id  // Link the voucher to the booking
        });

        // Save the booking to the database
        await booking.save();

        // Populate the customer field in the booking
        const populatedBooking = await Booking.findById(booking._id).populate('customer').populate('voucher');
        const hall = await Building.findById(hallId);

        const transactionFromBooking = new Transaction({
            buildingId: hallId,
            amount: rate,
            date: date,
            type: "Income",
            bookingId: populatedBooking._id,
            transactionFrom: "Hall",
            description: `تم حجز ${hall.name} بمبلغ قدره ${rate} دينار كويتي بتاريخ ${date} من قبل السيد/ ${populatedBooking.customer.name}`
        });
        await transactionFromBooking.save();

        res.status(201).json({
            message: 'Booking created successfully',
            booking: populatedBooking,
        });
    } catch (error) {
        console.error('Error making booking:', error);
        if (error.name === 'ValidationError') {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ message: 'An error occurred while making the booking' });
        }
    }
};
exports.cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.body;
        console.log(bookingId);
        // Find the booking by ID
        const booking = await Booking.findById(bookingId);
        console.log(booking)
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if the booking is already inactive
        if (!booking.active) {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }

        // Update the booking status to inactive
        booking.active = false;
        await booking.save();

        // Remove the associated transaction from the transaction table
        await Transaction.findOneAndDelete({ bookingId: booking._id });

        res.status(200).json({ message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        res.status(500).json({ message: 'An error occurred while cancelling the booking' });
    }
};
exports.editBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const { date, startTime, endTime, rate, tenantName, tenantContactNumber, tenantCivilId, dateOfEvent, voucherNo } = req.body;
        console.log("Req Body: ", req.body)

        let booking = await Booking.findById(bookingId).populate('voucher');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        console.log(booking)

        // Check if a booking already exists for the same day and time (excluding the current booking)
        if (date && startTime && endTime) {
            const existingBooking = await Booking.findOne({
                _id: { $ne: bookingId },
                hallId: booking.hallId,
                date,
                dateOfEvent: dateOfEvent,
                startTime: { $lte: endTime },
                endTime: { $gte: startTime },
            });
            if (existingBooking) {
                return res.status(400).json({ message: 'A booking already exists for the specified day and time' });
            }
        }

        // Update the booking fields if provided
        if (date) booking.date = date;
        if (startTime) booking.startTime = startTime;
        if (endTime) booking.endTime = endTime;
        if (rate) booking.rate = rate;
        if (dateOfEvent) booking.dateOfEvent = dateOfEvent;
        console.log('Booking update:', booking)

        // Update the customer fields if provided
        if (tenantName || tenantContactNumber || tenantCivilId) {
            const customer = await Tenant.findById(booking.customer);
            if (tenantName) customer.name = tenantName;
            if (tenantContactNumber) customer.contactNumber = tenantContactNumber;
            if (tenantCivilId) customer.civilId = tenantCivilId;
            await customer.save();
            console.log("Customer: ", customer)
        }

        // Update or create the voucher
        if (booking.voucher) {
            booking.voucher.amount = rate;
            booking.voucher.paidDate = dateOfEvent;
            if (voucherNo) booking.voucher.voucherNo = voucherNo;
            await booking.voucher.save();
        } else {
            const newVoucher = new Voucher({
                buildingId: booking.hallId,
                tenantId: booking.customer,
                amount: rate,
                paidDate: dateOfEvent,
                status: 'Paid',
                voucherNo: voucherNo
            });
            await newVoucher.save();
            booking.voucher = newVoucher._id;
        }

        // Save the updated booking
        await booking.save();

        // Update the associated transaction in the transaction table if rate and date are provided
        if (rate && date) {
            await Transaction.findOneAndUpdate(
                { bookingId: booking._id },
                {
                    amount: rate,
                    date: date,
                    description: `${booking.hallId.name} booked for ${rate} on ${date} booked by ${booking.customer.name}`,
                    active: true
                }
            );
        }

        // Fetch the updated booking with populated customer and voucher
        booking = await Booking.findById(bookingId).populate('customer').populate('voucher');

        res.status(200).json({ message: 'Booking updated successfully', booking });
    } catch (error) {
        console.error('Error editing booking:', error);
        if (error.name === 'ValidationError') {
            res.status(400).json({ error: error.message });
        } else if (error.name === 'CastError') {
            res.status(400).json({ error: 'Invalid ID format' });
        } else {
            res.status(500).json({ message: 'An error occurred while editing the booking', error: error.message });
        }
    }
};
exports.deleteBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedBooking = await Booking.findByIdAndDelete(id);

        if (!deletedBooking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        res.status(200).json({ message: 'Booking deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting booking', error: error.message });
    }
};

exports.getBookingsByHallAndDate = async (req, res) => {
    try {
        const { hallId, date, searchRate, page = 1, limit = 10, searchCivilId } = req.query;
        console.log(searchRate)
        let query = {
            hallId,
            active: true
        };

        if (date) {
            query.dateOfEvent = new Date(date);
        }

        if (searchRate) {
            query.rate = parseInt(searchRate);
        }
        console.log(query)
        if (searchCivilId) {
            const customer = await Tenant.findOne({ civilId: searchCivilId });
            if (customer) {
                query.customer = customer._id;
            } else {
                // If no customer found with the given civil ID, return empty result
                return res.status(200).json({
                    success: true,
                    data: [],
                    totalPages: 0,
                    currentPage: 1,
                    totalCount: 0
                });
            }
        }

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            populate: ['customer', 'voucher'],
            sort: { dateOfEvent: 1 }  // Sort by date of event in ascending order
        };

        const bookings = await Booking.paginate(query, options);

        res.status(200).json({
            success: true,
            data: bookings.docs,
            totalPages: bookings.totalPages,
            currentPage: bookings.page,
            totalCount: bookings.totalDocs
        });
    } catch (error) {
        console.error("Error in getBookingsByHallAndDate:", error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};
exports.getAllBookingsByHall = async (req, res) => {
    try {
        const { hallId } = req.params;
        const { searchCivilId, searchRate } = req.query;
        const page = parseInt(req.query.page, 10) || 1;
        const resultsPerPage = parseInt(req.query.resultsPerPage, 10) || 10;
        const skip = (page - 1) * resultsPerPage;

        // Create the base query
        let query = { hallId };

        // If civilId is provided, add it to the query
        if (searchCivilId) {
            query['customer.civilId'] = searchCivilId;
        }

        // If rate is provided, add it to the query
        if (searchRate) {
            query.rate = parseInt(searchRate);
        }

        // Find all active bookings for the specified hall, sorted by date
        const bookings = await Booking.find(query)
            .sort({ dateOfEvent: -1 }) // Sort by dateOfEvent in descending order
            .populate({
                path: 'customer',
                match: searchCivilId ? { civilId: searchCivilId } : {}
            })
            .populate('voucher')
            .skip(skip)
            .limit(resultsPerPage);

        // Filter out bookings where customer is null (due to civilId mismatch)
        const filteredBookings = bookings.filter(booking => booking.customer !== null);

        const count = await Booking.countDocuments(query);

        res.status(200).json({
            data: filteredBookings,
            count: count,
            metadata: { total: count },
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};

exports.getAllBookingsByHallCSV = async (req, res) => {
    try {
        const { hallId } = req.params;
        const bookings = await Booking.find({ hallId })
            .sort({ dateOfEvent: -1 })
            .populate('customer')
            .populate('hallId')
            .lean()
            .exec();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Hall Bookings');

        worksheet.columns = [
            { header: 'تاريخ الحجز', key: 'bookingDate', width: 15 },
            { header: 'تاريخ الفعالية', key: 'eventDate', width: 15 },
            { header: 'السعر', key: 'price', width: 15 },
            { header: 'اسم العميل', key: 'customerName', width: 20 },
            { header: 'رقم هاتف العميل', key: 'customerPhone', width: 20 },
            { header: 'اسم القاعة', key: 'hallName', width: 20 }
        ];

        // Function to format date as dd/mm/yyyy
        const formatDate = (date) => {
            if (!date) return 'N/A';
            return moment(date).format('DD/MM/YYYY');
        };

        let totalAmount = 0;

        // Add data rows
        bookings.forEach((booking) => {
            const price = booking.rate || 0;
            totalAmount += price;

            worksheet.addRow({
                bookingDate: formatDate(booking.date),
                eventDate: formatDate(booking.dateOfEvent),
                price: price || 'N/A',
                customerName: booking.customer ? booking.customer.name : 'N/A',
                customerPhone: booking.customer ? booking.customer.contactNumber : 'N/A',
                hallName: booking.hallId ? booking.hallId.name : 'N/A'
            });
        });

        // Add total row
        worksheet.addRow({
            bookingDate: '',
            eventDate: '',
            price: totalAmount,
            customerName: '',
            customerPhone: '',
            hallName: 'المجموع الكلي'
        });

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

        // Style the total row
        const lastRow = worksheet.lastRow;
        lastRow.font = { bold: true };
        lastRow.getCell('hallName').alignment = { horizontal: 'right' };
        lastRow.getCell('price').alignment = { horizontal: 'left' };

        // Set text direction for the entire sheet to RTL
        worksheet.views = [
            { rightToLeft: true }
        ];

        // Generate Excel file
        const buffer = await workbook.xlsx.writeBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="hall_bookings.xlsx"');
        res.send(buffer);
    } catch (error) {
        console.error("Error exporting hall bookings to XLSX:", error);
        res.status(500).json({ message: "Error exporting hall bookings to XLSX", error: error.message });
    }
};