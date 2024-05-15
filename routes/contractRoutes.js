
const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');

router.get('/contracts', contractController.getAllContracts)

module.exports = router;