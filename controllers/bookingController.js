const mongoose = require('mongoose');
const Booking = require('../models/bookingSchema');
const Tenant = require('../models/tenantSchema')

exports.makeABooking = async (req, res) => {
    try {
        const { hallId, date, startTime, endTime, rate, tenantName, tenantContactNumber, tenantCivilId, tenantType } = req.body;

        // Check if a booking already exists for the same day and time
        const existingBooking = await Booking.findOne({
            hallId,
            date,
            startTime: { $lte: endTime },
            endTime: { $gte: startTime },
        });

        if (existingBooking) {
            return res.status(400).json({ message: 'A booking already exists for the specified day and time' });
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
            customer: tenant._id,
        });

        // Save the booking to the database
        await booking.save();

        // Populate the customer field in the booking
        const populatedBooking = await Booking.findById(booking._id).populate('customer');

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

exports.getBookingsByHallAndDate = async (req, res) => {
    try {
        const { hallId, date } = req.query;

        // Find bookings by hall ID and date
        const bookings = await Booking.find({
            hallId,
            date: new Date(date),
        }).populate('customer', 'name email'); // Populate customer details

        // Format the bookings data for the timeline
        const formattedBookings = bookings.map((booking) => ({
            id: booking._id,
            group: booking.customer.name,
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