
const express = require('express');
const router = express.Router();
const buildingController = require('../controllers/buildingController');


router.get('/buildings', buildingController.getAllBuildings)
router.get("/buildingcount/", buildingController.getAllBuildingCount)
router.get('/building-export',buildingController.getAllBuildingsFormatted)


router.get('/halls', buildingController.getAllHalls)
router.get('/buildingdropdown', buildingController.getAllBuildingsDropdown)
router.get('/buildingcount', buildingController.getAllBuildingCount)
router.get('/building/:id', buildingController.getBuildingById);
router.post('/createbuilding', buildingController.createBuilding);
router.post('/building/backup', buildingController.createBuildingBackup);
router.put('/editbuilding/:id', buildingController.updateBuilding)
router.delete('/deletebuilding/:id', buildingController.deleteBuilding);
module.exports = router;
