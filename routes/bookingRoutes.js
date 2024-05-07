const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.post('/createbooking', bookingController.makeABooking)
router.get('/bookingsbydate', bookingController.getBookingsByHallAndDate);

module.exports = router;