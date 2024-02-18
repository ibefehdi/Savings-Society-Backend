const express = require('express');
const router = express.Router();
const { joiShareholderSchema } = require("../validationModels/joiModels")
const validateRequiredFields = require('../middleware/middleware');
const { createShareholder, addSavingsToShareholder, editShareholder, withdrawWealth } = require('../controllers/shareholderController');

//POST Routes
router.post("/shareholder", validateRequiredFields(joiShareholderSchema), createShareholder)
router.get("/shareholder/withdraw/:id", withdrawWealth)
//PUT Routes
router.put("/shareholdersavings/:id", addSavingsToShareholder)
router.put("/shareholder/:id", editShareholder)

module.exports = router;