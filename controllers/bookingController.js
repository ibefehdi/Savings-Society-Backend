const mongoose = require('mongoose');
const Booking = require('../models/bookingSchema');
const Tenant = require('../models/tenantSchema')
const Transaction = require('../models/transactionSchema');
const Building = require('../models/buildingSchema');
const Voucher = require('../models/voucherSchema')
const path = require('path');
const fs = require('fs');

exports.makeABooking = async (req, res) => {
    try {
        const { hallId, date, startTime, endTime, rate, tenantName, tenantContactNumber, tenantCivilId, tenantType, dateOfEvent } = req.body;
        console.log(tenantName, tenantContactNumber, tenantCivilId, tenantType, dateOfEvent)
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
        });

        // Save the booking to the database
        await booking.save();

        // Populate the customer field in the booking
        const populatedBooking = await Booking.findById(booking._id).populate('customer');
        const hall = await Building.findById(hallId);
        const voucher = new Voucher({
            buildingId: hallId,
            tenantId: tenant._id,
            amount: rate,
            paidDate: new Date(),
            status: 'Paid',
        });
        await voucher.save();
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
        const { bookingId, date, startTime, endTime, rate, tenantName, tenantContactNumber, tenantCivilId, dateOfEvent } = req.body;
        console.log(dateOfEvent)
        // Find the booking by ID
        const booking = await Booking.findById(bookingId).populate('customer');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        // Check if the booking is inactive
        if (!booking.active) {
            return res.status(400).json({ message: 'Cannot edit a cancelled booking' });
        }

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

        // Update the tenant fields if provided
        if (tenantName) booking.customer.name = tenantName;
        if (tenantContactNumber) booking.customer.contactNumber = tenantContactNumber;
        if (tenantCivilId) booking.customer.civilId = tenantCivilId;
        // if (tenantType) booking.customer.type = tenantType;
        if (dateOfEvent) booking.customer.dateOfEvent = dateOfEvent;
        console.log("This is the date of event: " + dateOfEvent)
        // Save the updated booking and tenant
        await booking.customer.save();
        await booking.save();
        console.log(booking)
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

        res.status(200).json({ message: 'Booking updated successfully', booking });
    } catch (error) {
        console.error('Error editing booking:', error);
        if (error.name === 'ValidationError') {
            res.status(400).json({ error: error.message });
        } else {
            res.status(500).json({ message: 'An error occurred while editing the booking' });
        }
    }
};
exports.getBookingsByHallAndDate = async (req, res) => {
    try {
        const { hallId, date } = req.query;

        // Find bookings by hall ID and date
        const bookings = await Booking.findOne({
            hallId,
            dateOfEvent: new Date(date),
            active: true
        }).populate('customer');
        console.log(bookings);
        // Format the bookings data for the timeline


        res.status(200).json({
            success: true,
            data: bookings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};
exports.getAllBookingsByHall = async (req, res) => {
    try {
        const { hallId } = req.params;

        // Find all active bookings for the specified hall, sorted by date
        const bookings = await Booking.find({
            hallId,

        })
            .sort({ dateOfEvent: -1 }) // Sort by dateOfEvent in descending order
            .populate('customer');
        const count = await Booking.countDocuments({ hallId })
        res.status(200).json({
            data: bookings,
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