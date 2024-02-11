const express = require('express');
const router = express.Router();
const { joiShareholderSchema } = require("../validationModels/joiModels")
const validateRequiredFields = require('../middleware/middleware');
const { createShareholder } = require('../controllers/shareholderController');

router.post("/shareholder", createShareholder)
module.exports = router;