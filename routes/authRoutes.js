const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);

// Return current user's info
router.get('/user', auth, (req, res) => {
    res.json({
        username: req.user.username,
        email: req.user.email
    });
});

module.exports = router;