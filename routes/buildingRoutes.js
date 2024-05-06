
const express = require('express');
const router = express.Router();
const buildingController = require('../controllers/buildingController');


router.get('/buildings', buildingController.getAllBuildings)
router.get('/halls', buildingController.getAllHalls)
router.get('/buildingdropdown', buildingController.getAllBuildingsDropdown)
router.get('/building/:id', buildingController.getBuildingById);
router.post('/createbuilding', buildingController.createBuilding);
router.put('/editbuilding/:id', buildingController.updateBuilding)
router.delete('/deletebuilding/:id', buildingController.deleteBuilding);
module.exports = router;
