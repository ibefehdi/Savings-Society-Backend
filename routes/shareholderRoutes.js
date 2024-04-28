const express = require('express');
const router = express.Router();
const { joiShareholderSchema } = require("../validationModels/joiModels")
const validateRequiredFields = require('../middleware/middleware');
const { createShareholder, addSavingsToShareholder, editShareholder, withdrawWealth, getAllShareholders, getShareholderById, withdrawSavings, withdrawShares, addSharesToShareholder, getShareholderFinancials, getShareholderCount, getShareholderActiveCount, withdrawAmanat, getUserAmanat, getAllShareholdersFormatted, createShareholderBackup, makeUserInactive } = require('../controllers/shareholderController');

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
router.post("/shareholder/withdrawshares/:id", withdrawShares)
router.post("/shareholder/depositsavings/:id", addSavingsToShareholder)
router.post("/shareholder/depositshares/:id", addSharesToShareholder)
router.post("/shareholder/withdrawamanat/:id", withdrawAmanat)
//PUT Routes
router.put("/shareholder/:id", editShareholder)
router.put("/disableShareholder/:id", makeUserInactive)
//GET Routes
router.get("/shareholders", getAllShareholders)
router.get("/shareholder/:id", getShareholderById)
router.get("/shareholder/financials/:id", getShareholderFinancials)
router.get("/shareholdercount/", getShareholderCount)
router.get("/getShareholderAmanat/:id", getUserAmanat)
router.get("/shareholderactivecount/", getShareholderActiveCount)
router.get("/shareholdercsv/", getAllShareholdersFormatted)
module.exports = router;