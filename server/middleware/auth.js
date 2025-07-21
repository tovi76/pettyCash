const jwt = require('jsonwebtoken');
const { getOne } = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database to ensure they still exist and are active
        const userResult = await getOne(
            'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );

        if (!userResult.success || !userResult.data) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }

        if (!userResult.data.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        req.user = userResult.data;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        return res.status(403).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

// Check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

// Check if user is admin or accessing their own data
const requireAdminOrSelf = (req, res, next) => {
    const targetUserId = parseInt(req.params.userId || req.params.id);
    
    if (req.user.role === 'admin' || req.user.id === targetUserId) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Access denied'
        });
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireAdminOrSelf
};
