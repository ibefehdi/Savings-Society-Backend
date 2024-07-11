const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');

router.get('/tenants', tenantController.getAllTenants)
router.post('/tenantsbycivilid', tenantController.getTenantByCivilId)
module.exports = router;