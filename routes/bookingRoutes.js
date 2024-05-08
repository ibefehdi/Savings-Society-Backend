const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.post('/createbooking', bookingController.makeABooking)
router.put('/editbooking', bookingController.editBooking);
router.get('/bookingsbydate', bookingController.getBookingsByHallAndDate);
router.post('/cancelbooking', bookingController.cancelBooking)

module.exports = router;