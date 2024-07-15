// routes.js

const express = require('express');
const router = express.Router();
const withdrawalHistoryController = require('../controllers/WithdrawalHistoryController');  // Update the path as necessary

// Route to get all deposit histories
router.get('/withdrawalhistory', withdrawalHistoryController.getAllWithdrawalHistory);
router.get('/withdrawal-history-report', withdrawalHistoryController.getWithdrawalHistoryReportExport);
router.get('/TransferHistory', withdrawalHistoryController.getAllTransferLog);
module.exports = router;
