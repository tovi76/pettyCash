const jwt = require('jsonwebtoken');
const { getOne } = require('../config/database');

// Verify JWT token
const authenticateToken = async (req, res, next) => {
    console.log('🔐 === AUTH MIDDLEWARE STARTED ===');
    console.log('📋 Request URL:', req.method, req.originalUrl);
    
    const authHeader = req.headers['authorization'];
    console.log('🎫 Auth header:', authHeader ? 'Present' : 'Missing');
    
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    console.log('🔑 Token extracted:', token ? 'Yes' : 'No');

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        console.log('🔍 Verifying JWT token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token decoded successfully. User ID:', decoded.userId);
        
        // Get user from database to ensure they still exist and are active
        console.log('🔍 Looking up user in database...');
        const userResult = await getOne(
            'SELECT id, email, full_name, role, is_active FROM users WHERE id = ?',
            [decoded.userId]
        );
        console.log('📊 User lookup result:', userResult.success ? 'Success' : 'Failed');

        if (!userResult.success || !userResult.data) {
            console.log('❌ User not found in database');
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }

        if (!userResult.data.is_active) {
            console.log('❌ User account is deactivated');
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        console.log('✅ User authenticated:', userResult.data.email);
        req.user = userResult.data;
        next();
    } catch (error) {
        console.log('❌ Auth middleware error:', error.name, error.message);
        console.log('🔍 Full error:', error);
        
        if (error.name === 'TokenExpiredError') {
            console.log('⏰ Token expired');
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        
        console.log('❌ Invalid token or other auth error');
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
    requireAdminOrSelf,
    requireRole: (role) => {
        return async (req, res, next) => {
            if (req.user.role !== role) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied - ${role} role required`
                });
            }
            next();
        };
    }
};
