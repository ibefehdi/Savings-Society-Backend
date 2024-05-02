// routes.js

const express = require('express');
const router = express.Router();
const depositHistoryController = require('../controllers/DepositHistoryController'); 

// Route to get all deposit histories
router.get('/deposithistory', depositHistoryController.getAllDepositHistory);

module.exports = router;
