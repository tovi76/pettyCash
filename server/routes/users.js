const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get all users (admin only)
router.get('/', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Users endpoint working',
            data: []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;
