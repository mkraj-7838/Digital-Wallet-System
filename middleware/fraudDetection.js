const config = require('../config/config');
const Transaction = require('../models/Transaction');

const fraudDetection = async (req, res, next) => {
    try {
        const { amount, type } = req.body;
        const userId = req.user._id;

        // Check transaction amount limits
        if (amount < config.MIN_TRANSACTION_AMOUNT || amount > config.MAX_TRANSACTION_AMOUNT) {
            return res.status(400).json({
                error: 'Transaction amount outside allowed limits',
                details: {
                    min: config.MIN_TRANSACTION_AMOUNT,
                    max: config.MAX_TRANSACTION_AMOUNT
                }
            });
        }

        // Check for suspicious patterns
        const recentTransactions = await Transaction.find({
            $or: [{ sender: userId }, { receiver: userId }],
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        // Check for multiple failed attempts
        const failedAttempts = recentTransactions.filter(t => t.status === 'FAILED').length;
        if (failedAttempts >= 3) {
            return res.status(400).json({
                error: 'Multiple failed attempts detected. Please contact support.'
            });
        }

        // Check for unusual transaction patterns
        if (type === 'TRANSFER') {
            const dailyTransferAmount = recentTransactions
                .filter(t => t.type === 'TRANSFER' && t.status === 'COMPLETED')
                .reduce((sum, t) => sum + t.amount, 0);

            if (dailyTransferAmount + amount > config.MAX_DAILY_TRANSFER_LIMIT) {
                return res.status(400).json({
                    error: 'Daily transfer limit exceeded'
                });
            }
        }

        // Add fraud detection metadata to request
        req.fraudDetection = {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            timestamp: new Date()
        };

        next();
    } catch (error) {
        res.status(500).json({ error: 'Error in fraud detection' });
    }
};

module.exports = fraudDetection;