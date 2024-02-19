const express = require('express');
const router = express.Router();

const { CreateShareConfig } = require('../controllers/ShareConfigController');
/**
 * @openapi
 * /api/v1/:
 *   get:
 *     summary: Returns a list of users
 *     responses:
 *       200:
 *         description: A JSON array of user objects
 */
//POST Routes

router.post('/createshareconfig', CreateShareConfig);

module.exports = router;