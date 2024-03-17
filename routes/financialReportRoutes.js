const express = require('express');
const { getAllShareholderReport } = require('../controllers/financialReportController');
const router = express.Router();

router.get('/financialReports', getAllShareholderReport)

module.exports = router;