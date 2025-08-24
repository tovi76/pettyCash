const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { authenticateToken, requireRole } = require('../middleware/auth');

console.log('📝 SPECIAL REQUESTS ROUTER LOADED! 📝');

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'petty_cash_db',
    charset: 'utf8mb4'
};

// Create a new special expense request
router.post('/', authenticateToken, async (req, res) => {
    let connection;
    try {
        const { amount, purpose, justification } = req.body;
        const userId = req.user.id;

        // Validation
        if (!amount || !purpose) {
            return res.status(400).json({ 
                success: false, 
                message: 'Amount and purpose are required' 
            });
        }

        if (amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Amount must be greater than 0' 
            });
        }

        connection = await mysql.createConnection(dbConfig);

        const [result] = await connection.execute(
            `INSERT INTO special_expense_requests (user_id, amount, purpose, justification) 
             VALUES (?, ?, ?, ?)`,
            [userId, amount, purpose, justification || null]
        );

        // Log the activity
        await connection.execute(
            `INSERT INTO activity_log (user_id, action, entity_type, entity_id, new_values) 
             VALUES (?, 'create', 'special_request', ?, ?)`,
            [userId, result.insertId, JSON.stringify({ amount, purpose, justification })]
        );

        res.json({
            success: true,
            message: 'Special expense request submitted successfully',
            requestId: result.insertId
        });

    } catch (error) {
        console.error('Error creating special request:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create special expense request' 
        });
    } finally {
        if (connection) await connection.end();
    }
});

// Get user's special requests
router.get('/my-requests', authenticateToken, async (req, res) => {
    let connection;
    try {
        const userId = req.user.id;
        console.log('🔍 Getting special requests for user:', userId);
        
        connection = await mysql.createConnection(dbConfig);

        const [requests] = await connection.execute(
            `SELECT 
                id, amount, purpose, justification, status, 
                admin_notes, approved_at, created_at, updated_at
             FROM special_expense_requests 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [userId]
        );

        console.log('📝 Found', requests.length, 'special requests for user', userId);
        console.log('📄 Requests:', requests);

        res.json({
            success: true,
            requests
        });

    } catch (error) {
        console.error('Error fetching user requests:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch requests' 
        });
    } finally {
        if (connection) await connection.end();
    }
});

// Get pending requests amount for user
router.get('/pending-amount', authenticateToken, async (req, res) => {
    let connection;
    try {
        const userId = req.user.id;
        
        connection = await mysql.createConnection(dbConfig);

        const [result] = await connection.execute(
            `SELECT COALESCE(SUM(amount), 0) as pending_amount 
             FROM special_expense_requests 
             WHERE user_id = ? AND status = 'pending'`,
            [userId]
        );

        res.json({
            success: true,
            pendingAmount: result[0].pending_amount
        });

    } catch (error) {
        console.error('Error fetching pending amount:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch pending amount' 
        });
    } finally {
        if (connection) await connection.end();
    }
});

// Admin routes - Get all pending requests
router.get('/admin/pending', authenticateToken, requireRole('admin'), async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const [requests] = await connection.execute(
            `SELECT * FROM special_requests_detailed 
             WHERE status = 'pending' 
             ORDER BY created_at ASC`
        );

        res.json({
            success: true,
            requests
        });

    } catch (error) {
        console.error('Error fetching pending requests:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch pending requests' 
        });
    } finally {
        if (connection) await connection.end();
    }
});

// Admin routes - Get all requests
router.get('/admin/all', authenticateToken, requireRole('admin'), async (req, res) => {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);

        const [requests] = await connection.execute(
            `SELECT * FROM special_requests_detailed 
             ORDER BY created_at DESC`
        );

        res.json({
            success: true,
            requests
        });

    } catch (error) {
        console.error('Error fetching all requests:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch requests' 
        });
    } finally {
        if (connection) await connection.end();
    }
});

// Admin approve/reject request
router.patch('/admin/:id/status', authenticateToken, requireRole('admin'), async (req, res) => {
    console.log('🚨 APPROVAL ENDPOINT CALLED! 🚨');
    console.log('Request params:', req.params);
    console.log('Request body:', req.body);
    
    let connection;
    try {
        const requestId = req.params.id;
        const { status, adminNotes } = req.body;
        const adminId = req.user.id;

        console.log(`🔍 === APPROVAL PROCESS STARTED ===`);
        console.log(`📝 Admin ${adminId} updating request ${requestId} to status: ${status}`);
        console.log(`📊 Request body:`, req.body);
        console.log(`📊 Request params:`, req.params);
        console.log(`👤 Admin user:`, req.user);

        // Validation
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status must be approved or rejected' 
            });
        }

        connection = await mysql.createConnection(dbConfig);

        console.log(`🔍 Fetching current request details...`);
        const [currentRequest] = await connection.execute(
            'SELECT * FROM special_expense_requests WHERE id = ?',
            [requestId]
        );

        console.log(`📋 Current request query result:`, currentRequest);

        if (currentRequest.length === 0) {
            console.log(`❌ Request ${requestId} not found`);
            return res.status(404).json({ message: 'Request not found' });
        }
        
        console.log(`✅ Found request:`, currentRequest[0]);

        if (currentRequest[0].status !== 'pending') {
            console.log(`❌ Request ${requestId} has already been processed`);
            return res.status(400).json({ 
                success: false, 
                message: 'Request has already been processed' 
            });
        }

        // Update request status
        await connection.execute(
            `UPDATE special_expense_requests 
             SET status = ?, admin_id = ?, admin_notes = ?, approved_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [status, adminId, adminNotes || null, requestId]
        );

        // If approved, add the amount to user's balance
        if (status === 'approved') {
            console.log('🔍 Starting balance update process...');
            const requestAmount = currentRequest[0].amount;
            const requestUserId = currentRequest[0].user_id;
            
            console.log(`💰 Adding ${requestAmount} to user ${requestUserId}'s balance`);
            console.log('📄 Current request data:', currentRequest[0]);
            
            try {
                // Update user's balance
                console.log('🔄 Executing balance update query...');
                const [updateResult] = await connection.execute(
                    `UPDATE users SET monthly_budget = monthly_budget + ? WHERE id = ?`,
                    [requestAmount, requestUserId]
                );
                console.log('✅ Balance update result:', updateResult);
                
                // Log the balance update
                console.log('📝 Logging balance update activity...');
                const [logResult] = await connection.execute(
                    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, new_values) 
                     VALUES (?, 'balance_update', 'user', ?, ?)`,
                    [adminId, requestUserId, JSON.stringify({ 
                        reason: 'special_request_approved', 
                        amount_added: requestAmount,
                        request_id: requestId 
                    })]
                );
                console.log('✅ Activity log result:', logResult);
                console.log('✅ Balance update process completed successfully');
                
            } catch (balanceError) {
                console.error('❌ Error in balance update process:', balanceError);
                console.error('Balance error details:', balanceError.message);
                console.error('Balance error stack:', balanceError.stack);
                throw balanceError; // Re-throw to maintain transaction integrity
            }
        }

        // Log the activity
        await connection.execute(
            `INSERT INTO activity_log (user_id, action, entity_type, entity_id, old_values, new_values) 
             VALUES (?, ?, 'special_request', ?, ?, ?)`,
            [
                adminId, 
                status === 'approved' ? 'approve' : 'reject',
                requestId,
                JSON.stringify({ status: 'pending' }),
                JSON.stringify({ status, admin_notes: adminNotes })
            ]
        );

        res.json({
            success: true,
            message: `Request ${status} successfully`
        });

    } catch (error) {
        console.error('Error updating request status:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update request status' 
        });
    } finally {
        if (connection) await connection.end();
    }
});

module.exports = router;
