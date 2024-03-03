const express = require('express');
const router = express.Router();

const { CreateShareConfig, GetAllSavingsConfigs, EditSavingsConfig } = require('../controllers/savingsConfigController');
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
router.get('/savingconfigs', GetAllSavingsConfigs)

//POST Routes
router.post('/createsavingconfig', CreateShareConfig);

//PUT Routes
router.put('/savingconfig/:id', EditSavingsConfig)

module.exports = router;