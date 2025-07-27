const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { executeQuery, getOne, getMany } = require('../config/database');

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                email,
                full_name,
                monthly_budget,
                is_active,
                created_at,
                (
                    SELECT COALESCE(SUM(amount), 0) 
                    FROM transactions 
                    WHERE user_id = users.id 
                    AND MONTH(transaction_date) = MONTH(CURRENT_DATE()) 
                    AND YEAR(transaction_date) = YEAR(CURRENT_DATE())
                ) as monthly_spent
            FROM users 
            WHERE is_active = TRUE
            ORDER BY created_at DESC
        `;
        
        const result = await executeQuery(query);
        if (!result.success) {
            throw new Error(result.error);
        }
        const users = result.data;
        
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת רשימת המשתמשים'
        });
    }
});

// Get user by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT 
                id,
                username,
                email,
                full_name,
                employee_id,
                department,
                role,
                is_active,
                created_at,
                last_login
            FROM users 
            WHERE id = ?
        `;
        
        const result = await getOne(query, [id]);
        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }
        const users = [result.data];
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }
        
        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת פרטי המשתמש'
        });
    }
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        console.log('📝 Create user request received:', req.body);
        const { email, password, full_name, monthly_budget = 0 } = req.body;
        
        // Validate required fields
        console.log('🔍 Validating required fields...');
        if (!email || !password || !full_name || monthly_budget <= 0) {
            console.log('❌ Validation failed - missing required fields');
            return res.status(400).json({
                success: false,
                message: 'כל השדות הנדרשים חייבים להיות מלאים'
            });
        }
        console.log('✅ All required fields present');
        
        
        // Check if email already exists
        console.log('🔍 Checking for existing users...');
        const checkQuery = 'SELECT id FROM users WHERE email = ?';
        console.log('📊 Executing query:', checkQuery);
        console.log('📊 Query params:', [email]);
        const existingResult = await executeQuery(checkQuery, [email]);
        console.log('📊 Query result:', existingResult);
        if (!existingResult.success) {
            console.log('❌ Database query failed:', existingResult.error);
            throw new Error(existingResult.error);
        }
        const existing = existingResult.data;
        console.log('✅ Existing users check completed, found:', existing.length, 'matches');
        
        if (existing.length > 0) {
            console.log('❌ User already exists, returning 400 error');
            return res.status(400).json({
                success: false,
                message: 'אימייל כבר קיים במערכת'
            });
        }
        
        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);
        
        // Insert new user
        const insertQuery = `
            INSERT INTO users (email, password_hash, full_name, monthly_budget, is_active)
            VALUES (?, ?, ?, ?, TRUE)
        `;
        
        const insertResult = await executeQuery(insertQuery, [
            email, password_hash, full_name, monthly_budget
        ]);
        if (!insertResult.success) {
            throw new Error(insertResult.error);
        }
        
        // Get the created user
        const newUserResult = await getOne(
            'SELECT id, email, full_name, monthly_budget, is_active, created_at FROM users WHERE id = ?',
            [insertResult.data.insertId]
        );
        if (!newUserResult.success) {
            throw new Error('Failed to fetch created user');
        }
        
        console.log('✅ User created successfully:', newUserResult.data);
        res.status(201).json({
            success: true,
            message: 'משתמש נוצר בהצלחה',
            data: newUserResult.data
        });
    } catch (error) {
        console.error('❌ Error creating user:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת המשתמש'
        });
    }
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, full_name, monthly_budget, is_active, password } = req.body;
        
        // Check if user exists
        const existingUserResult = await getOne('SELECT id FROM users WHERE id = ?', [id]);
        if (!existingUserResult.success) {
            throw new Error(existingUserResult.error);
        }
        const existingUser = existingUserResult.data;
        
        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }
        
        // Check for duplicate email (excluding current user)
        const checkQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
        const duplicatesResult = await executeQuery(checkQuery, [email, id]);
        if (!duplicatesResult.success) {
            throw new Error(duplicatesResult.error);
        }
        const duplicates = duplicatesResult.data;
        
        if (duplicates.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'אימייל כבר קיים במערכת'
            });
        }
        
        // Update user
        let updateQuery = `
            UPDATE users 
            SET email = ?, full_name = ?, monthly_budget = ?, is_active = ?
            WHERE id = ?
        `;
        let updateParams = [email, full_name, monthly_budget, is_active, id];
        
        // If password is provided, include it in the update
        if (password && password.trim() !== '') {
            const saltRounds = 10;
            const password_hash = await bcrypt.hash(password, saltRounds);
            updateQuery = `
                UPDATE users 
                SET email = ?, full_name = ?, monthly_budget = ?, is_active = ?, password_hash = ?
                WHERE id = ?
            `;
            updateParams = [email, full_name, monthly_budget, is_active, password_hash, id];
        }
        
        const updateResult = await executeQuery(updateQuery, updateParams);
        if (!updateResult.success) {
            throw new Error(updateResult.error);
        }
        
        // Get updated user
        const updatedUserResult = await getOne(
            'SELECT id, email, full_name, monthly_budget, is_active, created_at FROM users WHERE id = ?',
            [id]
        );
        if (!updatedUserResult.success) {
            throw new Error('Failed to fetch updated user');
        }
        
        res.json({
            success: true,
            message: 'פרטי המשתמש עודכנו בהצלחה',
            data: updatedUserResult.data
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון פרטי המשתמש'
        });
    }
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🗑️ Delete user request received for ID:', id);
        
        // Check if user exists
        const existingUserResult = await getOne('SELECT id, username FROM users WHERE id = ?', [id]);
        if (!existingUserResult.success) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }
        const existingUser = existingUserResult.data ? [existingUserResult.data] : [];
        if (existingUser.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }
        
        // Don't allow deleting admin users
        const adminCheckResult = await getOne('SELECT role FROM users WHERE id = ?', [id]);
        if (!adminCheckResult.success) {
            return res.status(404).json({
                success: false,
                message: 'משתמש לא נמצא'
            });
        }
        const adminCheck = [adminCheckResult.data];
        if (adminCheck[0].role === 'admin') {
            return res.status(400).json({
                success: false,
                message: 'לא ניתן למחוק משתמש מנהל'
            });
        }
        
        // Soft delete - set is_active to false instead of actual deletion
        console.log('💾 Performing soft delete (setting is_active = FALSE)...');
        const deleteResult = await executeQuery('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
        console.log('📊 Delete query result:', deleteResult);
        if (!deleteResult.success) {
            console.log('❌ Delete query failed:', deleteResult.error);
            throw new Error(deleteResult.error);
        }
        
        console.log('✅ User soft deleted successfully');
        res.json({
            success: true,
            message: 'המשתמש הוסר בהצלחה'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקת המשתמש'
        });
    }
});

// Get user statistics (admin only)
router.get('/:id/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const statsQuery = `
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(amount), 0) as total_spent,
                COALESCE(SUM(CASE WHEN MONTH(transaction_date) = MONTH(CURRENT_DATE()) AND YEAR(transaction_date) = YEAR(CURRENT_DATE()) THEN amount ELSE 0 END), 0) as monthly_spent,
                COALESCE(AVG(amount), 0) as avg_transaction
            FROM transactions 
            WHERE user_id = ?
        `;
        
        const statsResult = await getOne(statsQuery, [id]);
        if (!statsResult.success) {
            throw new Error(statsResult.error);
        }
        const stats = [statsResult.data];
        
        res.json({
            success: true,
            data: stats[0]
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת סטטיסטיקות המשתמש'
        });
    }
});

module.exports = router;
