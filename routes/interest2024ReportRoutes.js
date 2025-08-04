const express = require('express');
const router = express.Router();
const { generate2024InterestReport } = require('../controllers/interest2024ReportController');

/**
 * @swagger
 * /api/interest2024Report/generate:
 *   get:
 *     summary: Generate 2024 Interest Calculation Report
 *     description: Generates an Excel file with all shareholders' interest calculations for 2024 using the new calculation approach
 *     tags: [Interest Reports]
 *     responses:
 *       200:
 *         description: Excel file generated successfully
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       500:
 *         description: Error generating report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 error:
 *                   type: string
 */
router.get('/generate', generate2024InterestReport);

module.exports = router;