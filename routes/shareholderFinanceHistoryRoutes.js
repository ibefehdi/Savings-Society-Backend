const express = require('express');
const router = express.Router();
const shareholderFinanceHistoryController = require('../controllers/shareholderFinanceHistoryController');

router.get('/shareholder-finance-history', shareholderFinanceHistoryController.getAllShareholderFinanceHistory);
router.get('/shareholder-finance-history/shareholder/:shareholderId', shareholderFinanceHistoryController.getByShareholderId);
router.get('/shareholder-finance-history/year/:year', shareholderFinanceHistoryController.getByYear);

module.exports = router;