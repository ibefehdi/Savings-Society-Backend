const express = require('express');
const router = express.Router();
const { joiShareholderSchema } = require("../validationModels/joiModels")
const validateRequiredFields = require('../middleware/middleware');
const { createShareholder, addSavingsToShareholder, editShareholder, withdrawWealth, getAllShareholders, getShareholderById, withdrawSavings, withdrawShares, addSharesToShareholder, getShareholderFinancials, getShareholderCount, getShareholderActiveCount, withdrawAmanat, getUserAmanat, getAllShareholdersFormatted, createShareholderBackup, makeUserInactive, addShareholderSavingsForBackup, getShareholderByMembersCode, getShareholdersWithAmanat, moveSavingsToAmanat, getShareholderAmanatReportExport, getTransferLogReportExport, makeUserActive, getAllShareholdersSharesFormatted, getAllShareholdersSavingsFormatted, updateAllSavingsIncrease, addToSavings, assignIbanToShareholder, transferInterestToSavings, transferSpecificInterestToSavings, moveCurrentSavingsToAmanat, changeAlRaseed, updateShareholderSavings, forceApplyIncrement, calculatePotentialIncrement } = require('../controllers/shareholderController');

/**
 * @openapi
 * /api/v1/:
 *   get:
 *     summary: Returns a list of users
 *     responses:
 *       200:
 *         description: A JSON array of user objects
 */

//POST Routes
router.post("/shareholder", createShareholder)
router.post("/shareholder/backup", createShareholderBackup)
router.post("/shareholder/withdraw/:id", withdrawWealth);
router.post("/shareholder/withdrawsavings/:id", withdrawSavings)
router.post("/shareholder/movesavingstoamanat/:id", moveSavingsToAmanat)
router.post("/shareholder/movecurrentsavingstoamanat/:id", moveCurrentSavingsToAmanat)
router.post("/shareholder/moveinteresttosavings/:id", addToSavings)
router.post("/shareholder/withdrawshares/:id", withdrawShares)
router.post("/shareholder/depositsavings/:id", addSavingsToShareholder)
router.post("/shareholder/depositshares/:id", addSharesToShareholder)
router.post("/shareholder/withdrawamanat/:id", withdrawAmanat)
router.post("/shareholder/deposit/backup", addShareholderSavingsForBackup)
router.post("/shareholderbymemberscode", getShareholderByMembersCode)
router.post('/shareholder/assigniban', assignIbanToShareholder);
router.post('/shareholder/movetosavingsfromexcel', transferInterestToSavings)
router.post('/shareholder/moveinteresttosavingscustom', transferSpecificInterestToSavings)
router.post('/shareholder/changebalance', updateShareholderSavings)
router.post('/shareholder/:id/force-increment', forceApplyIncrement);

//PUT Routes
router.put("/shareholder/:id", editShareholder)
router.put("/disableShareholder/:id", makeUserInactive)
router.put("/enableShareholder/:id", makeUserActive)
router.put("/changeAlRaseed/:id", changeAlRaseed)
//GET Routes
router.get("/shareholders", getAllShareholders)
router.get("/shareholder/:id", getShareholderById)
router.get("/shareholder/financials/:id", getShareholderFinancials)
router.get("/shareholdercount/", getShareholderCount)
router.get("/getShareholderAmanat/:id", getUserAmanat)
router.get("/shareholderactivecount/", getShareholderActiveCount)
router.get("/shareholdercsv/", getAllShareholdersFormatted)
router.get("/shareholderwithamanat/", getShareholdersWithAmanat)
router.get('/shareholder-amanat-report', getShareholderAmanatReportExport);
router.get('/transfer-log-report', getTransferLogReportExport);
router.get('/shareholder-share/', getAllShareholdersSharesFormatted);
router.get('/shareholder-savings/', getAllShareholdersSavingsFormatted);
router.get('/update-savings-increase', updateAllSavingsIncrease);
router.get('/shareholder/:id/calculate-potential-increment', calculatePotentialIncrement);

module.exports = router;