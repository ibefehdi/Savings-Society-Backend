const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '..', 'uploads', 'civilIDs');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
router.post('/createbooking', upload.single('civilIdDocument'), bookingController.makeABooking)
router.put('/editbooking/:id', bookingController.editBooking);
// router.get('/bookingsbydate', bookingController.getBookingsByHallAndDate);
router.post('/cancelbooking', bookingController.cancelBooking)
router.get('/bookingbydate', bookingController.getBookingsByHallAndDate)
router.get('/bookingbyhall/:hallId', bookingController.getAllBookingsByHall)
router.get('/bookings/:hallId/export', bookingController.getAllBookingsByHallCSV);
router.delete('/bookings/:id', bookingController.deleteBooking);
module.exports = router;