const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

const generateToken = (userId) => {
    return jwt.sign({ userId }, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN
    });
};

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                error: 'User with this email or username already exists'
            });
        }

        // Create new user
        const user = new User({
            username,
            email,
            password
        });

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                walletBalance: user.getWalletBalance('USD')
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: 'Error registering user' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                walletBalance: user.getWalletBalance('USD')
            },
            token
        });
    } catch (error) {
        res.status(500).json({ error: 'Error logging in' });
    }
};

module.exports = {
    register,
    login
};