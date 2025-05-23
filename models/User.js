const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    wallets: [{
        currency: {
            type: String,
            required: true,
            enum: ['USD', 'EUR', 'GBP', 'JPY'],
            default: 'USD'
        },
        balance: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    dailyTransferAmount: {
        type: Number,
        default: 0
    },
    lastTransferReset: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to reset daily transfer amount
userSchema.methods.resetDailyTransferAmount = function() {
    const now = new Date();
    const lastReset = new Date(this.lastTransferReset);
    
    if (now.getDate() !== lastReset.getDate() || 
        now.getMonth() !== lastReset.getMonth() || 
        now.getFullYear() !== lastReset.getFullYear()) {
        this.dailyTransferAmount = 0;
        this.lastTransferReset = now;
    }
};

// Method to get wallet balance for a specific currency
userSchema.methods.getWalletBalance = function(currency = 'USD') {
    const wallet = this.wallets.find(w => w.currency === currency);
    return wallet ? wallet.balance : 0;
};

// Method to update wallet balance for a specific currency
userSchema.methods.updateWalletBalance = async function(currency, amount) {
    let wallet = this.wallets.find(w => w.currency === currency);
    
    if (!wallet) {
        wallet = { currency, balance: 0 };
        this.wallets.push(wallet);
    }
    
    wallet.balance += amount;
    this.markModified('wallets');
    await this.save();
    return wallet.balance;
};

const User = mongoose.model('User', userSchema);

module.exports = User;