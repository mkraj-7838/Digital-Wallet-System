const User = require('../models/User');
const Transaction = require('../models/Transaction');

const deposit = async (req, res) => {
    try {
        const { amount, description } = req.body;
        const userId = req.user._id;
        const currency = req.body.currency || 'USD';

        // Validate inputs
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount: must be a positive number' });
        }
        if (!['USD', 'EUR', 'GBP', 'JPY'].includes(currency)) {
            return res.status(400).json({ error: 'Invalid currency: must be USD, EUR, GBP, or JPY' });
        }
        if (!req.fraudDetection) {
            return res.status(500).json({ error: 'Fraud detection metadata missing' });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Create transaction record
        const transaction = new Transaction({
            type: 'DEPOSIT',
            amount,
            currency,
            receiver: userId,
            description,
            metadata: req.fraudDetection
        });

        // Update user wallet balance
        let wallet = user.wallets.find(w => w.currency === currency);
        if (!wallet) {
            wallet = { currency, balance: 0 };
            user.wallets.push(wallet);
        }
        wallet.balance += amount;
        user.markModified('wallets');

        // Save user and transaction
        await user.save();
        transaction.status = 'COMPLETED';
        await transaction.save();

        res.json({
            message: 'Deposit successful',
            transaction,
            newBalance: wallet.balance
        });
    } catch (error) {
        console.error('Deposit error:', error.message, error.stack);
        res.status(500).json({ error: 'Error processing deposit', details: error.message });
    }
};

const withdraw = async (req, res) => {
    try {
        const { amount, description } = req.body;
        const userId = req.user._id;
        const currency = req.body.currency || 'USD';

        // Validate inputs
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount: must be a positive number' });
        }
        if (!['USD', 'EUR', 'GBP', 'JPY'].includes(currency)) {
            return res.status(400).json({ error: 'Invalid currency: must be USD, EUR, GBP, or JPY' });
        }
        if (!req.fraudDetection) {
            return res.status(500).json({ error: 'Fraud detection metadata missing' });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check balance
        let wallet = user.wallets.find(w => w.currency === currency);
        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Create transaction record
        const transaction = new Transaction({
            type: 'WITHDRAWAL',
            amount,
            currency,
            sender: userId,
            description,
            metadata: req.fraudDetection
        });

        // Update balance
        wallet.balance -= amount;
        user.markModified('wallets');

        // Save user and transaction
        await user.save();
        transaction.status = 'COMPLETED';
        await transaction.save();

        res.json({
            message: 'Withdrawal successful',
            transaction,
            newBalance: wallet.balance
        });
    } catch (error) {
        console.error('Withdraw error:', error.message, error.stack);
        res.status(500).json({ error: 'Error processing withdrawal', details: error.message });
    }
};

const transfer = async (req, res) => {
    try {
        const { amount, receiverEmail, receiverId, description, currency = 'USD' } = req.body;
        const senderId = req.user._id;

        // Validate inputs
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount: must be a positive number' });
        }
        if (!['USD', 'EUR', 'GBP', 'JPY'].includes(currency)) {
            return res.status(400).json({ error: 'Invalid currency: must be USD, EUR, GBP, or JPY' });
        }
        if (!req.fraudDetection) {
            return res.status(500).json({ error: 'Fraud detection metadata missing' });
        }

        // Find sender and receiver
        let receiverQuery = receiverId ? { _id: receiverId } : { email: receiverEmail };
        const [sender, receiver] = await Promise.all([
            User.findById(senderId),
            User.findOne({ ...receiverQuery, isDeleted: false, isActive: true })
        ]);

        if (!sender || !receiver) {
            return res.status(404).json({ error: 'Sender or receiver not found' });
        }
        if (senderId.toString() === receiver._id.toString()) {
            return res.status(400).json({ error: 'Cannot transfer to yourself' });
        }

        // Check sender's balance
        let senderWallet = sender.wallets.find(w => w.currency === currency);
        if (!senderWallet || senderWallet.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Create transaction record
        const transaction = new Transaction({
            type: 'TRANSFER',
            amount,
            currency,
            sender: senderId,
            receiver: receiver._id,
            description,
            metadata: req.fraudDetection,
            status: 'PENDING'
        });

        // Update sender's wallet
        senderWallet.balance -= amount;
        sender.dailyTransferAmount += amount;
        sender.markModified('wallets');

        // Update or create receiver's wallet
        let receiverWallet = receiver.wallets.find(w => w.currency === currency);
        if (!receiverWallet) {
            receiverWallet = { currency, balance: 0 };
            receiver.wallets.push(receiverWallet);
        }
        receiverWallet.balance += amount;
        receiver.markModified('wallets');

        // Save sender and transaction
        await sender.save();
        await transaction.save();

        try {
            // Save receiver
            await receiver.save();
            // Update transaction status
            transaction.status = 'COMPLETED';
            await transaction.save();

            res.json({
                message: 'Transfer successful',
                transaction,
                newBalance: senderWallet.balance
            });
        } catch (error) {
            // Manual rollback: revert sender's balance and mark transaction as failed
            senderWallet.balance += amount;
            sender.dailyTransferAmount -= amount;
            sender.markModified('wallets');
            await sender.save();

            transaction.status = 'FAILED';
            transaction.fraudReason = 'SYSTEM_ERROR';
            await transaction.save();

            throw error; // Propagate error to outer catch block
        }
    } catch (error) {
        console.error('Transfer error:', error.message, error.stack);
        res.status(500).json({ error: 'Error processing transfer', details: error.message });
    }
};

const getBalance = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const wallet = user.wallets.find(w => w.currency === 'USD');
        res.json({
            balance: wallet ? wallet.balance : 0
        });
    } catch (error) {
        console.error('Get balance error:', error.message, error.stack);
        res.status(500).json({ error: 'Error fetching balance', details: error.message });
    }
};

const getTransactionHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [transactions, total] = await Promise.all([
            Transaction.find({
                $or: [{ sender: userId }, { receiver: userId }],
                isDeleted: false
            })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .populate('sender receiver', 'username email'),
            Transaction.countDocuments({
                $or: [{ sender: userId }, { receiver: userId }],
                isDeleted: false
            })
        ]);

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Transaction history error:', error.message, error.stack);
        res.status(500).json({ error: 'Error fetching transaction history', details: error.message });
    }
};

module.exports = {
    deposit,
    withdraw,
    transfer,
    getBalance,
    getTransactionHistory
};