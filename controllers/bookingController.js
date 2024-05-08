const mongoose = require('mongoose');
const Booking = require('../models/bookingSchema');
const Tenant = require('../models/tenantSchema')
const Transaction = require('../models/transactionSchema');
const Building = require('../models/buildingSchema');
exports.makeABooking = async (req, res) => {
    try {
        const { hallId, date, startTime, endTime, rate, tenantName, tenantContactNumber, tenantCivilId, tenantType } = req.body;

        // Check if a booking already exists for the same day and time
        const existingBooking = await Booking.findOne({
            hallId,
            date,
            startTime: { $lte: endTime },
            endTime: { $gte: startTime },
            active: true
        });
        console.log(existingBooking);
        if (existingBooking && existingBooking.active) {
            return res.status(400).json({ message: 'An active booking already exists for the specified day and time' });
        }

        // Create a new tenant
        const tenantData = {
            name: tenantName,
            contactNumber: tenantContactNumber,
        };

        // Add optional fields if provided
        if (tenantCivilId) {
            tenantData.civilId = tenantCivilId;
        }
        if (tenantType) {
            tenantData.type = tenantType;
        }

        const tenant = await Tenant.create(tenantData);

        // Create a new booking
        const booking = new Booking({
            hallId,
            date,
            startTime,
            endTime,
            rate,
            active: true,
            customer: tenant._id,
        });

        // Save the booking to the database
        await booking.save();

        // Populate the customer field in the booking
        const populatedBooking = await Booking.findById(booking._id).populate('customer');
        const hall = await Building.findById(hallId);
        const transactionFromBooking = new Transaction({
            buildingId: hallId,
            amount: rate,
            date: date,
            type: "Income",
            bookingId: populatedBooking._id,
            transactionFrom: "Hall",
            description: `تم حجز ${hall.name} بمبلغ قدره ${rate} دينار كويتي بتاريخ ${date} من قبل السيد/ ${populatedBooking.customer.name}`
        })
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
        const { bookingId, date, startTime, endTime, rate, tenantName, tenantContactNumber, tenantCivilId, tenantType } = req.body;

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
        if (tenantType) booking.customer.type = tenantType;

        // Save the updated booking and tenant
        await booking.customer.save();
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
        const bookings = await Booking.find({
            hallId,
            date: new Date(date),
            active: true
        }).populate('customer'); // Populate customer details
        console.log(bookings);
        // Format the bookings data for the timeline
        const formattedBookings = bookings.map((booking) => ({
            id: booking._id,
            group: booking.customer.name,
            customerCivilId: booking.customer.civilId,
            mobile: booking.customer.contactNumber,
            rent: booking.rate,
            title: `${booking.startTime} - ${booking.endTime}`,
            startTime: booking.startTime,
            endTime: booking.endTime,
            customerEmail: booking.customer.email,
        }));

        res.status(200).json({
            success: true,
            data: formattedBookings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Server error',
        });
    }
};