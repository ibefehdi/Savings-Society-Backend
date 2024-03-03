const express = require('express');
const router = express.Router();
const { joiShareholderSchema } = require("../validationModels/joiModels")
const validateRequiredFields = require('../middleware/middleware');
const { createShareholder, addSavingsToShareholder, editShareholder, withdrawWealth, getAllShareholders, getShareholderById, withdrawSavings, withdrawShares } = require('../controllers/shareholderController');
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
router.post("/shareholder", validateRequiredFields(joiShareholderSchema), createShareholder)
router.post("/shareholder/withdraw/:id", withdrawWealth);
router.post("/shareholder/withdrawsavings/:id", withdrawSavings)
router.post("/shareholder/withdrawshares/:id", withdrawShares)

//PUT Routes
router.put("/shareholdersavings/:id", addSavingsToShareholder)
router.put("/shareholder/:id", editShareholder)
//GET Routes
router.get("/shareholders", getAllShareholders)
router.get("/shareholder/:id", getShareholderById)
module.exports = router;