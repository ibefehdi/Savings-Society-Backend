const express = require('express');
const { getAllShareholderReport, getAllShareholderByYear, getAllQuitShareholderByYear, getShareholderFinancialReport, getAllShareholdersByWorkplace } = require('../controllers/financialReportController');
const router = express.Router();

router.get('/financialReports', getAllShareholderReport)
router.get('/financialreportsbyyear', getAllShareholderByYear)
router.get('/financialreportsofquiters', getAllQuitShareholderByYear)
router.get('/financialreportofuser/:id', getShareholderFinancialReport)
router.get('/financialreportbyworkplace', getAllShareholdersByWorkplace)
module.exports = router;