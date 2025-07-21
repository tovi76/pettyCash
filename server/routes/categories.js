const express = require('express');
const { body, validationResult } = require('express-validator');
const { getOne, getMany, execute } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const categoryValidation = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('שם קטגוריה חייב להיות בין 2-100 תווים'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('תיאור לא יכול לעלות על 500 תווים'),
  body('color')
    .optional()
    .matches(/^#[0-9A-F]{6}$/i)
    .withMessage('צבע חייב להיות בפורמט hex תקין (#RRGGBB)'),
  body('budget_limit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('מגבלת תקציב חייבת להיות מספר חיובי'),
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('סטטוס פעיל חייב להיות true או false')
];

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    
    let whereClause = '';
    let queryParams = [];

    if (!includeInactive) {
      whereClause = 'WHERE is_active = true';
    }

    const categoriesQuery = `
      SELECT 
        c.*,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END), 0) as pending_amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      ${whereClause}
      GROUP BY c.id
      ORDER BY c.name
    `;

    const result = await getMany(categoriesQuery, queryParams);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת הקטגוריות'
      });
    }

    // Calculate budget utilization for each category
    const categoriesWithStats = result.data.map(category => ({
      ...category,
      budget_utilization: category.budget_limit > 0 
        ? Math.round((category.total_spent / category.budget_limit) * 100) 
        : null,
      is_over_budget: category.budget_limit > 0 && category.total_spent > category.budget_limit
    }));

    res.json({
      success: true,
      data: categoriesWithStats
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Get single category
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const categoryId = req.params.id;

    const categoryQuery = `
      SELECT 
        c.*,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END), 0) as pending_amount,
        COALESCE(AVG(t.amount), 0) as average_transaction
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id
      WHERE c.id = ?
      GROUP BY c.id
    `;

    const result = await getOne(categoryQuery, [categoryId]);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        message: 'קטגוריה לא נמצאה'
      });
    }

    const category = {
      ...result.data,
      budget_utilization: result.data.budget_limit > 0 
        ? Math.round((result.data.total_spent / result.data.budget_limit) * 100) 
        : null,
      is_over_budget: result.data.budget_limit > 0 && result.data.total_spent > result.data.budget_limit
    };

    res.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Create new category (admin only)
router.post('/', authenticateToken, requireRole('admin'), categoryValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות בנתונים',
        errors: errors.array()
      });
    }

    const { name, description, color, budget_limit, is_active } = req.body;

    // Check if category name already exists
    const existingCategory = await getOne(
      'SELECT id FROM categories WHERE name = ?',
      [name]
    );

    if (existingCategory.success && existingCategory.data) {
      return res.status(409).json({
        success: false,
        message: 'קטגוריה עם שם זה כבר קיימת'
      });
    }

    // Insert new category
    const insertResult = await execute(`
      INSERT INTO categories (name, description, color, budget_limit, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      name,
      description || null,
      color || '#2196F3',
      budget_limit || null,
      is_active !== undefined ? is_active : true
    ]);

    if (!insertResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה ביצירת הקטגוריה'
      });
    }

    // Get the created category
    const newCategory = await getOne(
      'SELECT * FROM categories WHERE id = ?',
      [insertResult.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'קטגוריה נוצרה בהצלחה',
      data: newCategory.data
    });

  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Update category (admin only)
router.put('/:id', authenticateToken, requireRole('admin'), categoryValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות בנתונים',
        errors: errors.array()
      });
    }

    const categoryId = req.params.id;
    const { name, description, color, budget_limit, is_active } = req.body;

    // Check if category exists
    const existingCategory = await getOne('SELECT id FROM categories WHERE id = ?', [categoryId]);

    if (!existingCategory.success || !existingCategory.data) {
      return res.status(404).json({
        success: false,
        message: 'קטגוריה לא נמצאה'
      });
    }

    // Check if name is taken by another category
    const nameCheck = await getOne(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [name, categoryId]
    );

    if (nameCheck.success && nameCheck.data) {
      return res.status(409).json({
        success: false,
        message: 'קטגוריה עם שם זה כבר קיימת'
      });
    }

    // Update category
    const updateResult = await execute(`
      UPDATE categories 
      SET name = ?, description = ?, color = ?, budget_limit = ?, is_active = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      name,
      description || null,
      color || '#2196F3',
      budget_limit || null,
      is_active !== undefined ? is_active : true,
      categoryId
    ]);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון הקטגוריה'
      });
    }

    res.json({
      success: true,
      message: 'קטגוריה עודכנה בהצלחה'
    });

  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Check if category exists
    const existingCategory = await getOne('SELECT id FROM categories WHERE id = ?', [categoryId]);

    if (!existingCategory.success || !existingCategory.data) {
      return res.status(404).json({
        success: false,
        message: 'קטגוריה לא נמצאה'
      });
    }

    // Check if category has transactions
    const transactionCheck = await getOne(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      [categoryId]
    );

    if (transactionCheck.success && transactionCheck.data.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'לא ניתן למחוק קטגוריה שיש לה עסקאות. ניתן להשבית אותה במקום זאת.'
      });
    }

    // Delete category
    const deleteResult = await execute('DELETE FROM categories WHERE id = ?', [categoryId]);

    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה במחיקת הקטגוריה'
      });
    }

    res.json({
      success: true,
      message: 'קטגוריה נמחקה בהצלחה'
    });

  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Toggle category status (admin only)
router.patch('/:id/toggle', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Get current status
    const categoryResult = await getOne('SELECT is_active FROM categories WHERE id = ?', [categoryId]);

    if (!categoryResult.success || !categoryResult.data) {
      return res.status(404).json({
        success: false,
        message: 'קטגוריה לא נמצאה'
      });
    }

    const newStatus = !categoryResult.data.is_active;

    // Update status
    const updateResult = await execute(
      'UPDATE categories SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, categoryId]
    );

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון סטטוס הקטגוריה'
      });
    }

    res.json({
      success: true,
      message: `קטגוריה ${newStatus ? 'הופעלה' : 'הושבתה'} בהצלחה`,
      data: { is_active: newStatus }
    });

  } catch (error) {
    console.error('Toggle category status error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Get category spending trends
router.get('/:id/trends', authenticateToken, async (req, res) => {
  try {
    const categoryId = req.params.id;
    const months = parseInt(req.query.months) || 12;

    // Check if category exists
    const categoryResult = await getOne('SELECT name FROM categories WHERE id = ?', [categoryId]);

    if (!categoryResult.success || !categoryResult.data) {
      return res.status(404).json({
        success: false,
        message: 'קטגוריה לא נמצאה'
      });
    }

    // Get monthly spending trends
    const trendsQuery = `
      SELECT 
        DATE_FORMAT(transaction_date, '%Y-%m') as month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        AVG(amount) as average_amount
      FROM transactions
      WHERE category_id = ? 
        AND transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY month DESC
    `;

    const trendsResult = await getMany(trendsQuery, [categoryId, months]);

    if (!trendsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת מגמות הקטגוריה'
      });
    }

    res.json({
      success: true,
      data: {
        category_name: categoryResult.data.name,
        trends: trendsResult.data
      }
    });

  } catch (error) {
    console.error('Get category trends error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Get categories with budget alerts
router.get('/alerts/budget', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const alertsQuery = `
      SELECT 
        c.id,
        c.name,
        c.budget_limit,
        c.color,
        COALESCE(SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END), 0) as pending_amount,
        ROUND((COALESCE(SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END), 0) / c.budget_limit) * 100, 2) as utilization_percentage
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND MONTH(t.transaction_date) = MONTH(CURDATE()) 
        AND YEAR(t.transaction_date) = YEAR(CURDATE())
      WHERE c.budget_limit > 0 AND c.is_active = true
      GROUP BY c.id
      HAVING utilization_percentage >= 80
      ORDER BY utilization_percentage DESC
    `;

    const alertsResult = await getMany(alertsQuery, []);

    if (!alertsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת התראות תקציב'
      });
    }

    const alerts = alertsResult.data.map(category => ({
      ...category,
      alert_level: category.utilization_percentage >= 100 ? 'critical' : 
                   category.utilization_percentage >= 90 ? 'high' : 'medium',
      is_over_budget: category.utilization_percentage >= 100
    }));

    res.json({
      success: true,
      data: alerts
    });

  } catch (error) {
    console.error('Get budget alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Initialize default categories (admin only)
router.post('/initialize', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    // Check if categories already exist
    const existingCategories = await getOne('SELECT COUNT(*) as count FROM categories', []);
    
    if (existingCategories.success && existingCategories.data.count > 0) {
      return res.status(409).json({
        success: false,
        message: 'קטגוריות כבר קיימות במערכת'
      });
    }

    const defaultCategories = [
      { name: 'מזון ומשקאות', description: 'ארוחות, חטיפים ומשקאות', color: '#FF9800', budget_limit: 1000 },
      { name: 'תחבורה', description: 'נסיעות, דלק וחניה', color: '#2196F3', budget_limit: 800 },
      { name: 'ציוד משרדי', description: 'מכשירי כתיבה, נייר ואביזרים', color: '#4CAF50', budget_limit: 500 },
      { name: 'אירוח לקוחות', description: 'פגישות עסקיות ואירוח', color: '#9C27B0', budget_limit: 1500 },
      { name: 'הדרכות וכנסים', description: 'השתלמויות מקצועיות', color: '#FF5722', budget_limit: 2000 },
      { name: 'בריאות וטיפוח', description: 'מוצרי היגיינה ובריאות', color: '#00BCD4', budget_limit: 300 },
      { name: 'תקשורת', description: 'טלפון, אינטרנט ודואר', color: '#795548', budget_limit: 400 },
      { name: 'אחר', description: 'הוצאות שונות', color: '#607D8B', budget_limit: 500 }
    ];

    // Insert all default categories
    for (const category of defaultCategories) {
      await execute(`
        INSERT INTO categories (name, description, color, budget_limit, is_active, created_at)
        VALUES (?, ?, ?, ?, true, NOW())
      `, [category.name, category.description, category.color, category.budget_limit]);
    }

    res.status(201).json({
      success: true,
      message: 'קטגוריות ברירת מחדל נוצרו בהצלחה',
      data: { created_count: defaultCategories.length }
    });

  } catch (error) {
    console.error('Initialize categories error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצירת קטגוריות ברירת מחדל'
    });
  }
});

module.exports = router;
