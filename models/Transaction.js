const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        enum: ['USD', 'EUR', 'GBP', 'JPY'],
        default: 'USD'
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.type === 'TRANSFER';
        }
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function() {
            return this.type === 'TRANSFER';
        }
    },
    status: {
        type: String,
        required: true,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'FLAGGED'],
        default: 'PENDING'
    },
    description: {
        type: String,
        trim: true
    },
    metadata: {
        ipAddress: String,
        userAgent: String,
        location: String
    },
    isFraudulent: {
        type: Boolean,
        default: false
    },
    fraudReason: {
        type: String,
        enum: ['RATE_LIMIT_EXCEEDED', 'SUSPICIOUS_AMOUNT', 'MULTIPLE_FAILED_ATTEMPTS', 'UNUSUAL_PATTERN', null],
        default: null
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
transactionSchema.index({ sender: 1, createdAt: -1 });
transactionSchema.index({ receiver: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ currency: 1, createdAt: -1 });
transactionSchema.index({ isFraudulent: 1, createdAt: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;