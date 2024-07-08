const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

router.get('/tenants', tenantController.getAllTenants)

module.exports = router;