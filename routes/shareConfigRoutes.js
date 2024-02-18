const express = require('express');
const router = express.Router();

const { CreateShareConfig } = require('../controllers/ShareConfigController');

//POST Routes

router.post('/createshareconfig', CreateShareConfig);

module.exports = router;