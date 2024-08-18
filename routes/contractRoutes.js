
const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contractController');

router.get('/contracts', contractController.getAllContracts)
router.get('/contracts/active', contractController.getActiveContracts);
router.get('/contracts/inactive', contractController.getInactiveContracts);
router.get('/contracts/export', contractController.getContractsCSV);

module.exports = router;