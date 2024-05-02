const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Create a new transaction
router.post('/createtransaction', transactionController.createTransaction);

// Get all transactions
router.get('/transactions', transactionController.getAllTransactions);

// Get transactions by type
router.get('/transactions/:type', transactionController.getTransactionsByType);

module.exports = router;