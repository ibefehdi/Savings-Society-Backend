const express = require('express');
const router = express.Router();
const logController = require('../controllers/logsController');

router.get('/logs', logController.getLogs);
router.get('/logs/search', logController.searchLogs);

module.exports = router;