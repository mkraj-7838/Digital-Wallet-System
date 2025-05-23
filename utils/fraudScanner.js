const Transaction = require('../models/Transaction');
const User = require('../models/User');
const config = require('../config/config');

const scanForFraud = async () => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Find all transactions in the last 24 hours
        const recentTransactions = await Transaction.find({
            createdAt: { $gte: oneDayAgo },
            isDeleted: false
        }).populate('sender receiver');

        // Group transactions by user
        const userTransactions = {};
        recentTransactions.forEach(transaction => {
            if (transaction.sender) {
                if (!userTransactions[transaction.sender._id]) {
                    userTransactions[transaction.sender._id] = [];
                }
                userTransactions[transaction.sender._id].push(transaction);
            }
        });

        // Analyze each user's transactions
        for (const [userId, transactions] of Object.entries(userTransactions)) {
            // Check for multiple transfers in short period
            const transferCount = transactions.filter(t => 
                t.type === 'TRANSFER' && 
                t.status === 'COMPLETED'
            ).length;

            if (transferCount > 10) {
                await flagTransactions(transactions, 'RATE_LIMIT_EXCEEDED');
            }

            // Check for large withdrawals
            const largeWithdrawals = transactions.filter(t =>
                t.type === 'WITHDRAWAL' &&
                t.amount > config.MAX_TRANSACTION_AMOUNT * 0.8
            );

            if (largeWithdrawals.length > 0) {
                await flagTransactions(largeWithdrawals, 'SUSPICIOUS_AMOUNT');
            }

            // Check for unusual patterns (e.g., multiple failed attempts)
            const failedAttempts = transactions.filter(t =>
                t.status === 'FAILED'
            ).length;

            if (failedAttempts >= 3) {
                await flagTransactions(transactions, 'MULTIPLE_FAILED_ATTEMPTS');
            }
        }

        console.log('Fraud scan completed successfully');
    } catch (error) {
        console.error('Error in fraud scan:', error);
    }
};

const flagTransactions = async (transactions, reason) => {
    try {
        const transactionIds = transactions.map(t => t._id);
        
        await Transaction.updateMany(
            { _id: { $in: transactionIds } },
            {
                $set: {
                    isFraudulent: true,
                    fraudReason: reason,
                    status: 'FLAGGED'
                }
            }
        );

        // TODO: Implement email alerts for flagged transactions
        console.log(`Flagged ${transactionIds.length} transactions for ${reason}`);
    } catch (error) {
        console.error('Error flagging transactions:', error);
    }
};

// Schedule fraud scan to run daily at midnight
const scheduleFraudScan = () => {
    const now = new Date();
    const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // tomorrow
        0, 0, 0 // midnight
    );
    const msToMidnight = night.getTime() - now.getTime();

    // Run first scan after midnight
    setTimeout(() => {
        scanForFraud();
        // Schedule subsequent scans every 24 hours
        setInterval(scanForFraud, 24 * 60 * 60 * 1000);
    }, msToMidnight);
};

module.exports = {
    scanForFraud,
    scheduleFraudScan
};