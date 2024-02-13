const express = require('express');
const router = express.Router();
const { joiShareholderSchema } = require("../validationModels/joiModels")
const validateRequiredFields = require('../middleware/middleware');
const { createShareholder, addSavingsToShareholder } = require('../controllers/shareholderController');

//POST Routes
router.post("/shareholder", validateRequiredFields(joiShareholderSchema), createShareholder)

//PUT Routes
router.put("/shareholdersavings/:id", addSavingsToShareholder)

module.exports = router;