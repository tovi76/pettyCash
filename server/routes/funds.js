const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get fund balance
router.get('/balance', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Fund balance endpoint working',
            data: { balance: 0 }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
