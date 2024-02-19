const express = require('express');
const router = express.Router();
const { joiShareholderSchema } = require("../validationModels/joiModels")
const validateRequiredFields = require('../middleware/middleware');
const { createShareholder, addSavingsToShareholder, editShareholder, withdrawWealth, getAllShareholders } = require('../controllers/shareholderController');
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
router.post("/shareholder/withdraw/:id", withdrawWealth)
//PUT Routes
router.put("/shareholdersavings/:id", addSavingsToShareholder)
router.put("/shareholder/:id", editShareholder)
//GET Routes
router.get("/shareholders", getAllShareholders)

module.exports = router;