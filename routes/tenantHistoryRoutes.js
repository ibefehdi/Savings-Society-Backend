const express = require('express');
const router = express.Router();
const tenantHistoryController = require('../controllers/tenantHistoryController');

router.post('/createTenantAndHistory', tenantHistoryController.createTenantAndHistory);
router.get('/tenant-histories', tenantHistoryController.getAllTenantHistories);
router.get('/tenant-history/:id', tenantHistoryController.getTenantHistoryById);
router.get('/tenant-histories/flat/:flatId', tenantHistoryController.getTenantHistoriesByFlat);
router.get('/flats/tenant/:tenantId', tenantHistoryController.getFlatsByTenant);

module.exports = router;