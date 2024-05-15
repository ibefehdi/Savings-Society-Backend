const express = require('express');
const router = express.Router();
const flatController = require('../controllers/flatController');

router.post('/createflat', flatController.createFlat);

router.get('/flats', flatController.getAllFlats);

// Get a flat by ID
router.get('/flat/:id', flatController.getFlatById);
router.get('/flatsbybuildingid/:buildingId', flatController.getFlatsByBuildingId)
router.get('/tenantsbyflatid/:id', flatController.getTenantByFlatId)
router.get('/removetenant/:id', flatController.removeTenant)
router.put('/addtenant/:id', flatController.assignTenantToFlat)

router.put('/replacetenant/:id', flatController.replaceTenant);
module.exports = router;