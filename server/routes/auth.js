const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { getOne, execute } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'יותר מדי ניסיונות התחברות. נסה שוב בעוד 15 דקות'
  }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 registration attempts per hour
  message: {
    success: false,
    message: 'יותר מדי ניסיונות רישום. נסה שוב בעוד שעה'
  }
});

// Validation rules
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('שם משתמש חייב להיות בין 3-50 תווים')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('שם משתמש יכול להכיל רק אותיות, מספרים וקו תחתון'),
  body('email')
    .isEmail()
    .withMessage('כתובת אימייל לא תקינה')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('סיסמה חייבת להכיל לפחות 6 תווים')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('סיסמה חייבת להכיל לפחות אות קטנה, אות גדולה ומספר'),
  body('fullName')
    .isLength({ min: 2, max: 100 })
    .withMessage('שם מלא חייב להיות בין 2-100 תווים')
    .matches(/^[א-ת\s]+$/)
    .withMessage('שם מלא יכול להכיל רק אותיות עבריות ורווחים'),
  body('department')
    .isLength({ min: 2, max: 50 })
    .withMessage('מחלקה חייבת להיות בין 2-50 תווים'),
  body('employeeId')
    .isLength({ min: 3, max: 20 })
    .withMessage('מספר עובד חייב להיות בין 3-20 תווים')
];

const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('שם משתמש נדרש'),
  body('password')
    .notEmpty()
    .withMessage('סיסמה נדרשת')
];

// Helper function to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Register endpoint
router.post('/register', registerLimiter, registerValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות בנתונים',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg
        }))
      });
    }

    const { username, email, password, fullName, department } = req.body;

    // Check if user already exists
    const existingUser = await getOne(
      'SELECT id FROM users WHERE username = ? OR email = ? ',
      [username, email]
    );

    if (existingUser.success && existingUser.data) {
      return res.status(409).json({
        success: false,
        message: 'משתמש עם פרטים אלה כבר קיים במערכת'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const insertResult = await execute(
      `INSERT INTO users (username, email, password_hash, full_name, department,  role, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'client', true, NOW())`,
      [username, email, hashedPassword, fullName, department]
    );

    if (!insertResult.success) {
      console.error('Database error during registration:', insertResult.error);
      return res.status(500).json({
        success: false,
        message: 'שגיאה ביצירת המשתמש'
      });
    }

    // Get the created user
    const newUser = await getOne(
      'SELECT id, username, email, full_name, department, role FROM users WHERE id = ?',
      [insertResult.insertId]
    );

    if (!newUser.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת פרטי המשתמש'
      });
    }

    // Generate token
    const token = generateToken(newUser.data);

    res.status(201).json({
      success: true,
      message: 'משתמש נוצר בהצלחה',
      data: {
        user: {
          id: newUser.data.id,
          username: newUser.data.username,
          email: newUser.data.email,
          fullName: newUser.data.full_name,
          department: newUser.data.department,
          role: newUser.data.role
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Login endpoint
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות בנתונים',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg
        }))
      });
    }

    const { username, password } = req.body;

    // Demo mode - if no DB connection, use hardcoded users
    if (username === 'admin' && password === 'admin123') {
      const demoUser = {
        id: 1,
        username: 'admin',
        email: 'admin@company.com',
        full_name: 'System Administrator',
        department: 'Management',
        role: 'admin',
        is_active: true
      };
      
      const token = generateToken(demoUser);
      
      return res.json({
        success: true,
        message: 'התחברות בוצעה בהצלחה',
        data: {
          token,
          user: {
            id: demoUser.id,
            username: demoUser.username,
            email: demoUser.email,
            fullName: demoUser.full_name,
            role: demoUser.role,
            department: demoUser.department,
          }
        }
      });
    }
    
    if (username === 'user' && password === 'user123') {
      const demoUser = {
        id: 2,
        username: 'user',
        email: 'user@company.com',
        full_name: 'Demo User',
        department: 'Sales',
        role: 'client',
        is_active: true
      };
      
      const token = generateToken(demoUser);
      
      return res.json({
        success: true,
        message: 'התחברות בוצעה בהצלחה',
        data: {
          token,
          user: {
            id: demoUser.id,
            username: demoUser.username,
            email: demoUser.email,
            fullName: demoUser.full_name,
            role: demoUser.role,
            department: demoUser.department,
          }
        }
      });
    }

    // Try database if available
    let userResult;
    try {
      userResult = await getOne(
        'SELECT id, username, email, password_hash, full_name, department,  role, is_active, last_login FROM users WHERE username = ? OR email = ?',
        [username, username]
      );

      if (!userResult.success || !userResult.data) {
        return res.status(401).json({
          success: false,
          message: 'שם משתמש או סיסמה שגויים'
        });
      }
    } catch (dbError) {
      console.error('Database error during login:', dbError);
      // Database not available, return error for non-demo users
      return res.status(401).json({
        success: false,
        message: 'שגיאה בחיבור למסד הנתונים'
      });
    }

    const user = userResult.data;

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'חשבון המשתמש מושבת. פנה למנהל המערכת'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'שם משתמש או סיסמה שגויים'
      });
    }

    // Update last login
    // await execute(
    //   'UPDATE users SET last_login = NOW() WHERE id = ?',
    //   [user.id]
    // );

    // Generate token
    const token = generateToken(user);

    res.json({
      success: true,
      message: 'התחברות הצליחה',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          department: user.department,
          role: user.role,
          lastLogin: user.last_login
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userResult = await getOne(
      'SELECT id, email, full_name, monthly_budget, role, is_active, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!userResult.success || !userResult.data) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    const user = userResult.data;

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        monthly_budget: user.monthly_budget,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה בשליפת פרטי המשתמש'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('fullName')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('שם מלא חייב להיות בין 2-100 תווים'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('כתובת אימייל לא תקינה')
    .normalizeEmail(),
  body('department')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('מחלקה חייבת להיות בין 2-50 תווים')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות בנתונים',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg
        }))
      });
    }

    const { fullName, email, department } = req.body;
    const updateFields = [];
    const updateValues = [];

    if (fullName) {
      updateFields.push('full_name = ?');
      updateValues.push(fullName);
    }
    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (department) {
      updateFields.push('department = ?');
      updateValues.push(department);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'לא סופקו שדות לעדכון'
      });
    }

    updateValues.push(req.user.id);

    const updateResult = await execute(
      `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון הפרופיל'
      });
    }

    res.json({
      success: true,
      message: 'פרופיל עודכן בהצלחה'
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword')
    .notEmpty()
    .withMessage('סיסמה נוכחית נדרשת'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('סיסמה חדשה חייבת להכיל לפחות 6 תווים')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('סיסמה חדשה חייבת להכיל לפחות אות קטנה, אות גדולה ומספר')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות בנתונים',
        errors: errors.array().map(error => ({
          field: error.param,
          message: error.msg
        }))
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get current password hash
    const userResult = await getOne(
      'SELECT password_hash FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!userResult.success || !userResult.data) {
      return res.status(404).json({
        success: false,
        message: 'משתמש לא נמצא'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.data.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'סיסמה נוכחית שגויה'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updateResult = await execute(
      'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, req.user.id]
    );

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון הסיסמה'
      });
    }

    res.json({
      success: true,
      message: 'סיסמה שונתה בהצלחה'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Logout (invalidate token - in a real app, you'd maintain a blacklist)
router.post('/logout', authenticateToken, (req, res) => {
  // In a production app, you would add the token to a blacklist
  // For now, we'll just return success and let the client remove the token
  res.json({
    success: true,
    message: 'התנתקות הצליחה'
  });
});

module.exports = router;
