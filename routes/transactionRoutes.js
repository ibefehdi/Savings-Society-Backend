const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Create a new transaction
router.post('/createtransaction', transactionController.createTransaction);

// Get all transactions
router.get('/transactions', transactionController.getAllTransactions);

// Get transactions by type
router.get('/transactions/:type', transactionController.getTransactionsByType);

router.get('/transactionsexport', transactionController.getAllTransactionsCSV);

router.get('/profit-report/export', transactionController.getProfitReportCSV);

router.get('/income-report-flat/export/:buildingId', transactionController.getProfitReportByFlatCSV)

router.get('/expenses/buildings', transactionController.getExpensesByBuilding);

router.get('/incomes/buildings', transactionController.getIncomeByBuilding);

router.get('/expenses/flats/:buildingId', transactionController.getExpensesByFlat);

router.get('/incomes/flats/:buildingId', transactionController.getIncomeByFlat);

router.get('/date-range/transactions', transactionController.getTransactionsByDateRange);

router.get('/date-range/transactions/building', transactionController.getTransactionsByBuildingAndDateRange);

module.exports = router;