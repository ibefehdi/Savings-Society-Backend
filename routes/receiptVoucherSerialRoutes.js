const express = require('express');
const router = express.Router();
const { incrementVoucherSerial } = require('../controllers/receiptVoucherSerialController');
router.post('/receipt-voucher-serials', incrementVoucherSerial);
module.exports = router;