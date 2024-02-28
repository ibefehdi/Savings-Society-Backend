const express = require('express');
const router = express.Router();

const { CreateShareConfig, EditShareConfig, GetAllShareConfigs } = require('../controllers/ShareConfigController');
/**
 * @openapi
 * /api/v1/:
 *   get:
 *     summary: Returns a list of users
 *     responses:
 *       200:
 *         description: A JSON array of user objects
 */

//GET Routes
router.get('/shareconfigs', GetAllShareConfigs)

//POST Routes
router.post('/createshareconfig', CreateShareConfig);

//PUT Routes
router.put('/shareconfig/:id', EditShareConfig)

module.exports = router;