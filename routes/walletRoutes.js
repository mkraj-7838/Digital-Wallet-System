const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const fraudDetection = require('../middleware/fraudDetection');
const {
    deposit,
    withdraw,
    transfer,
    getBalance,
    getTransactionHistory
} = require('../controllers/walletController');

// Protected routes
router.use(auth);

// Wallet operations
router.post('/deposit', fraudDetection, deposit);
router.post('/withdraw', fraudDetection, withdraw);
router.post('/transfer', fraudDetection, transfer);
router.get('/balance', getBalance);
router.get('/transactions', getTransactionHistory);

module.exports = router;