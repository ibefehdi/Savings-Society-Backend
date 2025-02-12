// routes.js

const express = require('express');
const router = express.Router();
const withdrawalHistoryController = require('../controllers/WithdrawalHistoryController');  // Update the path as necessary

// Route to get all deposit histories
router.get('/withdrawalhistory', withdrawalHistoryController.getAllWithdrawalHistory);
router.get('/withdrawal-history-report', withdrawalHistoryController.getWithdrawalHistoryReportExport);
router.get('/TransferHistory', withdrawalHistoryController.getAllTransferLog);
router.delete('/withdrawalhistory/:id', withdrawalHistoryController.deleteWithdrawalHistory);
router.delete('/TransferHistory/:id', withdrawalHistoryController.deleteTransferHistory);


module.exports = router;
