const express = require('express');
const router = express.Router();
const workplaceController = require('../controllers/WorkplaceController'); // Adjust the path as necessary

router.post('/workplace', workplaceController.createWorkplace);
router.get('/workplaces', workplaceController.getAllWorkplace);
router.get('/workplacesdropdown', workplaceController.getAllWorkplaceDropdown)
module.exports = router;
