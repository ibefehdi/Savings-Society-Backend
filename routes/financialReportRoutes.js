const express = require('express');
const { getAllShareholderReport, getAllShareholderByYear, getAllQuitShareholderByYear, getShareholderFinancialReport, getAllShareholdersByWorkplace, getAllShareholderAmanatReport, getShareholderReportExport, getShareholderReport, getAllShareholderAmanatReportExport } = require('../controllers/financialReportController');
const router = express.Router();

router.get('/financialReports', getAllShareholderReport)
router.get('/financialReports/export', getShareholderReportExport);
router.get('/financialreportsbyyear', getAllShareholderByYear)
router.get('/financialreportsofquiters', getAllQuitShareholderByYear)
router.get('/financialreportofuser/:id', getShareholderReport)
router.get('/financialreportbyworkplace', getAllShareholdersByWorkplace)
router.get('/financialreportsbyamanat', getAllShareholderAmanatReport)
router.get('/financialreportsbyamanatexport', getAllShareholderAmanatReportExport)
module.exports = router;