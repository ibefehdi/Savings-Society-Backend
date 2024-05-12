const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucherController');

// Route for getting all vouchers
router.get('/vouchers', voucherController.getAllVouchers);

// Route for getting pending vouchers
router.get('/vouchers/pending', voucherController.getPendingVouchers);

// Route for getting paid vouchers
router.get('/vouchers/paid', voucherController.getPaidVouchers);

router.post('/voucherpaid/:id', voucherController.payVoucher)

module.exports = router;