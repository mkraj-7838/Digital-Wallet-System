const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getFlaggedTransactions,
    getTotalBalances,
    getTopUsersByBalance,
    getTopUsersByVolume,
    softDeleteUser,
    softDeleteTransaction
} = require('../controllers/adminController');

// Admin middleware to check if user is an admin
const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!req.user.isAdmin || !req.user.isActive || req.user.isDeleted) {
            return res.status(403).json({ error: 'Access denied: Admin privileges required' });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ error: 'Server error during admin check' });
    }
};

// Protected admin routes
router.use(auth);
router.use(isAdmin);

// Reporting endpoints
router.get('/flagged-transactions', getFlaggedTransactions);
router.get('/total-balances', getTotalBalances);
router.get('/top-users/balance', getTopUsersByBalance);
router.get('/top-users/volume', getTopUsersByVolume);

// Management endpoints
router.delete('/users/:userId', softDeleteUser);
router.delete('/transactions/:transactionId', softDeleteTransaction);

module.exports = router;