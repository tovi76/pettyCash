const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult, query } = require('express-validator');
const { getOne, getMany, executeQuery, insert } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const ocrService = require('../services/ocrService'); // Import real OCR service

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/receipts');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `receipt-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('רק קבצי תמונה (JPEG, PNG) או PDF מותרים'));
    }
  }
});

// Real OCR function using ocrService
const performOCR = async (filePath) => {
  const ocrData = await ocrService.processReceipt(filePath);
  return ocrData;
};

// Validation rules
const transactionValidation = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('סכום חייב להיות מספר חיובי'),
  body('description')
    .isLength({ min: 3, max: 500 })
    .withMessage('תיאור חייב להיות בין 3-500 תווים'),
  body('category_id')
    .isInt({ min: 1 })
    .withMessage('קטגוריה נדרשת'),
  body('transaction_date')
    .isISO8601()
    .withMessage('תאריך לא תקין'),
  body('store_name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('שם חנות לא יכול לעלות על 100 תווים')
];

// Get all transactions (with filters)
router.get('/', authenticateToken, [
  query('page').optional().isInt({ min: 1 }).withMessage('מספר עמוד לא תקין'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('מגבלת תוצאות לא תקינה'),
  query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('סטטוס לא תקין'),
  query('category_id').optional().isInt({ min: 1 }).withMessage('קטגוריה לא תקינה'),
  query('start_date').optional().isISO8601().withMessage('תאריך התחלה לא תקין'),
  query('end_date').optional().isISO8601().withMessage('תאריך סיום לא תקין')
], async (req, res) => {
  console.log('🚀 === TRANSACTIONS GET ROUTE STARTED ===');
  console.log('👤 User from token:', req.user);
  console.log('🔍 Raw query params:', req.query);
  console.log('📋 Request headers:', req.headers.authorization ? 'Token present' : 'No token');
  
  try {
    console.log('📊 GET transactions request');
    console.log('👤 User:', req.user?.id, req.user?.email);
    console.log('🔍 Query params:', req.query);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות בפרמטרים',
        errors: errors.array()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    // Filter by user role
    if (req.user.role === 'client') {
      whereClause += ' AND t.user_id = ?';
      queryParams.push(parseInt(req.user.id));
    }

    // Apply filters
    if (req.query.status) {
      whereClause += ' AND t.status = ?';
      queryParams.push(req.query.status);
    }

    if (req.query.category_id) {
      whereClause += ' AND t.category_id = ?';
      queryParams.push(parseInt(req.query.category_id));
    }

    if (req.query.start_date) {
      whereClause += ' AND t.transaction_date >= ?';
      queryParams.push(req.query.start_date);
    }

    if (req.query.end_date) {
      whereClause += ' AND t.transaction_date <= ?';
      queryParams.push(req.query.end_date);
    }

    // Get transactions with user and category info
    const transactionsQuery = `
      SELECT 
        t.id,
        t.amount,
        t.description,
        t.transaction_date,
        t.store_name,
        t.receipt_path,
        t.status,
        t.created_at,
        t.updated_at,
        u.email,
        u.full_name,
        u.monthly_budget,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT ? OFFSET ?
    `;

    queryParams.push(limit, offset);

    console.log('💾 Executing transactions query...');
    console.log('📝 Query:', transactionsQuery);
    console.log('📝 Params:', queryParams);
    
    const transactionsResult = await getMany(transactionsQuery, queryParams);
    
    console.log('📊 Query result:', transactionsResult);

    if (!transactionsResult.success) {
      console.log('❌ Database query failed:', transactionsResult.error);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת העסקאות',
        error: transactionsResult.error
      });
    }

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      ${whereClause.replace('LIMIT ? OFFSET ?', '')}
    `;

    const countResult = await getOne(countQuery, queryParams.slice(0, -2));
    const total = countResult.success ? countResult.data.total : 0;

    res.json({
      success: true,
      data: {
        transactions: transactionsResult.data,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Get single transaction
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transactionId = req.params.id;

    let whereClause = 'WHERE t.id = ?';
    let queryParams = [transactionId];

    // Clients can only see their own transactions
    if (req.user.role === 'client') {
      whereClause += ' AND t.user_id = ?';
      queryParams.push(req.user.id);
    }

    const transactionQuery = `
      SELECT 
        t.*,
        u.email,
        u.full_name,
        u.monthly_budget,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      ${whereClause}
    `;

    const result = await getOne(transactionQuery, queryParams);

    if (!result.success || !result.data) {
      return res.status(404).json({
        success: false,
        message: 'עסקה לא נמצאה'
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Create new transaction
router.post('/', authenticateToken, upload.single('receipt'), transactionValidation, async (req, res) => {
  try {
    console.log('🆕 New transaction creation request');
    console.log('👤 User:', req.user?.id, req.user?.email);
    console.log('📝 Request body:', req.body);
    console.log('📎 File uploaded:', !!req.file);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'שגיאות בנתונים',
        errors: errors.array()
      });
    }

    const { amount, description, category_id, transaction_date, store_name } = req.body;
    console.log('✅ Validation passed, extracted data:', { amount, description, category_id, transaction_date, store_name });
    let receiptPath = null;
    let ocrData = null;

    // Process receipt if uploaded
    if (req.file) {
      receiptPath = req.file.path;
      
      try {
        ocrData = await performOCR(receiptPath);
      } catch (ocrError) {
        console.error('OCR processing error:', ocrError);
        // Continue without OCR data
      }
    }

    // Insert transaction
    const insertQuery = `
      INSERT INTO transactions (
        user_id, amount, description, category_id, transaction_date, 
        store_name, receipt_path, ocr_data, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const insertParams = [
      req.user.id,
      amount,
      description,
      category_id,
      transaction_date,
      store_name || null,
      receiptPath,
      ocrData ? JSON.stringify(ocrData) : null
    ];
    
    console.log('💾 Executing database insert...');
    console.log('📝 Query:', insertQuery);
    console.log('📝 Params:', insertParams);
    
    const insertResult = await insert(insertQuery, insertParams);
    
    console.log('📊 Insert result:', insertResult);

    if (!insertResult.success) {
      console.log('❌ Database insert failed:', insertResult.error);
      return res.status(500).json({
        success: false,
        message: 'שגיאה ביצירת העסקה',
        error: insertResult.error
      });
    }
    
    console.log('✅ Transaction inserted successfully with ID:', insertResult.insertId);

    // Get the created transaction with full details
    const newTransaction = await getOne(`
      SELECT 
        t.*,
        u.email,
        u.full_name,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `, [insertResult.insertId]);

    res.status(201).json({
      success: true,
      message: 'עסקה נוצרה בהצלחה',
      data: {
        transaction: newTransaction.data,
        ocrData: ocrData
      }
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Update transaction (clients can only update their own pending transactions)
router.put('/:id', authenticateToken, transactionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות בנתונים',
        errors: errors.array()
      });
    }

    const transactionId = req.params.id;
    const { amount, description, category_id, transaction_date, store_name } = req.body;

    // Check if transaction exists and user has permission
    let whereClause = 'WHERE id = ?';
    let queryParams = [transactionId];

    if (req.user.role === 'client') {
      whereClause += ' AND user_id = ? AND status = "pending"';
      queryParams.push(req.user.id);
    }

    const existingTransaction = await getOne(`SELECT id, status FROM transactions ${whereClause}`, queryParams);

    if (!existingTransaction.success || !existingTransaction.data) {
      return res.status(404).json({
        success: false,
        message: 'עסקה לא נמצאה או אין הרשאה לעדכון'
      });
    }

    // Update transaction
    const updateResult = await execute(`
      UPDATE transactions 
      SET amount = ?, description = ?, category_id = ?, transaction_date = ?, 
          store_name = ?, updated_at = NOW()
      WHERE id = ?
    `, [amount, description, category_id, transaction_date, store_name, transactionId]);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון העסקה'
      });
    }

    res.json({
      success: true,
      message: 'עסקה עודכנה בהצלחה'
    });

  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Update transaction status (admin only)
router.patch('/:id/status', authenticateToken, requireRole('admin'), [
  body('status').isIn(['pending', 'approved', 'rejected']).withMessage('סטטוס לא תקין'),
  body('admin_notes').optional().isLength({ max: 500 }).withMessage('הערות מנהל לא יכולות לעלות על 500 תווים')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'שגיאות בנתונים',
        errors: errors.array()
      });
    }

    const transactionId = req.params.id;
    const { status, admin_notes } = req.body;

    // Check if transaction exists
    const existingTransaction = await getOne('SELECT id FROM transactions WHERE id = ?', [transactionId]);

    if (!existingTransaction.success || !existingTransaction.data) {
      return res.status(404).json({
        success: false,
        message: 'עסקה לא נמצאה'
      });
    }

    // Update status
    const updateResult = await execute(`
      UPDATE transactions 
      SET status = ?, admin_notes = ?, approved_by = ?, approved_at = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      status, 
      admin_notes || null, 
      status === 'approved' ? req.user.id : null,
      status === 'approved' ? new Date() : null,
      transactionId
    ]);

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בעדכון סטטוס העסקה'
      });
    }

    res.json({
      success: true,
      message: `עסקה ${status === 'approved' ? 'אושרה' : status === 'rejected' ? 'נדחתה' : 'עודכנה'} בהצלחה`
    });

  } catch (error) {
    console.error('Update transaction status error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Delete transaction (admin only, or client for pending transactions)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const transactionId = req.params.id;

    // Check if transaction exists and user has permission
    let whereClause = 'WHERE id = ?';
    let queryParams = [transactionId];

    if (req.user.role === 'client') {
      whereClause += ' AND user_id = ? AND status = "pending"';
      queryParams.push(req.user.id);
    }

    const existingTransaction = await getOne(`
      SELECT id, receipt_path FROM transactions ${whereClause}
    `, queryParams);

    if (!existingTransaction.success || !existingTransaction.data) {
      return res.status(404).json({
        success: false,
        message: 'עסקה לא נמצאה או אין הרשאה למחיקה'
      });
    }

    // Delete receipt file if exists
    if (existingTransaction.data.receipt_path) {
      try {
        await fs.unlink(existingTransaction.data.receipt_path);
      } catch (fileError) {
        console.error('Error deleting receipt file:', fileError);
        // Continue with transaction deletion even if file deletion fails
      }
    }

    // Delete transaction
    const deleteResult = await execute('DELETE FROM transactions WHERE id = ?', [transactionId]);

    if (!deleteResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה במחיקת העסקה'
      });
    }

    res.json({
      success: true,
      message: 'עסקה נמחקה בהצלחה'
    });

  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Receipt upload endpoint for existing transactions
router.post('/:id/receipt', authenticateToken, upload.single('receipt'), async (req, res) => {
  try {
    const transactionId = req.params.id;
    
    // Validate file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No receipt file uploaded'
      });
    }

    // Get transaction and verify ownership
    const transactionResult = await getOne(
      'SELECT * FROM transactions WHERE id = ? AND (user_id = ? OR ? = "admin")',
      [transactionId, req.user.id, req.user.role]
    );

    if (!transactionResult.success || !transactionResult.data) {
      // Delete uploaded file if transaction not found
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = transactionResult.data;
    
    // Delete old receipt file if exists
    if (transaction.receipt_path) {
      try {
        await fs.unlink(transaction.receipt_path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup old receipt file:', cleanupError);
      }
    }

    // Update transaction with new receipt path
    const updateResult = await execute(
      'UPDATE transactions SET receipt_path = ?, updated_at = NOW() WHERE id = ?',
      [req.file.path, transactionId]
    );

    if (!updateResult.success) {
      // Delete uploaded file if database update failed
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }
      
      return res.status(500).json({
        success: false,
        message: 'Failed to update transaction with receipt'
      });
    }

    // Log activity
    await execute(
      'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'RECEIPT_UPLOADED', JSON.stringify({ 
        transaction_id: transactionId,
        file_name: req.file.filename,
        file_size: req.file.size
      })]
    );

    res.json({
      success: true,
      message: 'Receipt uploaded successfully',
      data: {
        transaction_id: transactionId,
        receipt_path: req.file.path,
        file_name: req.file.filename
      }
    });

  } catch (error) {
    console.error('Receipt upload error:', error);
    
    // Cleanup uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.warn('Failed to cleanup uploaded file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: 'Receipt upload failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// OCR endpoint for receipt processing
router.post('/:id/ocr', authenticateToken, async (req, res) => {
  try {
    const transactionId = req.params.id;
    
    // Get transaction and verify ownership
    const transactionResult = await getOne(
      'SELECT * FROM transactions WHERE id = ? AND (user_id = ? OR ? = "admin")',
      [transactionId, req.user.id, req.user.role]
    );

    if (!transactionResult.success || !transactionResult.data) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = transactionResult.data;
    
    if (!transaction.receipt_path) {
      return res.status(400).json({
        success: false,
        message: 'No receipt file found for this transaction'
      });
    }

    // Check if file exists
    const receiptPath = path.join(__dirname, '..', transaction.receipt_path);
    try {
      await fs.access(receiptPath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Receipt file not found on server'
      });
    }

    // Process with real OCR
    console.log('Starting OCR processing for transaction:', transactionId);
    const ocrData = await ocrService.processReceipt(receiptPath);
    
    // Update transaction with OCR data
    const updateResult = await execute(
      `UPDATE transactions SET 
        amount = ?, 
        description = ?, 
        category_id = (SELECT id FROM categories WHERE name = ? LIMIT 1),
        transaction_date = ?,
        ocr_data = ?,
        updated_at = NOW()
      WHERE id = ?`,
      [
        ocrData.amount,
        `${ocrData.storeName} - ${ocrData.items.slice(0, 3).join(', ')}`,
        ocrData.category,
        ocrData.date,
        JSON.stringify(ocrData),
        transactionId
      ]
    );

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update transaction with OCR data'
      });
    }

    // Log activity
    await execute(
      'INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'OCR_PROCESSED', JSON.stringify({ 
        transaction_id: transactionId,
        confidence: ocrData.confidence,
        store_name: ocrData.storeName,
        amount: ocrData.amount
      })]
    );

    res.json({
      success: true,
      message: 'OCR processing completed successfully',
      data: {
        ...ocrData,
        transaction_id: transactionId
      }
    });

  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({
      success: false,
      message: 'OCR processing failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get transaction statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    // Filter by user role
    if (req.user.role === 'client') {
      whereClause += ' AND user_id = ?';
      queryParams.push(req.user.id);
    }

    // Add date filter if provided
    if (req.query.start_date) {
      whereClause += ' AND transaction_date >= ?';
      queryParams.push(req.query.start_date);
    }

    if (req.query.end_date) {
      whereClause += ' AND transaction_date <= ?';
      queryParams.push(req.query.end_date);
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        AVG(amount) as average_amount
      FROM transactions
      ${whereClause}
    `;

    const statsResult = await getOne(statsQuery, queryParams);

    if (!statsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת הסטטיסטיקות'
      });
    }

    res.json({
      success: true,
      data: statsResult.data
    });

  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Get current user's transactions
router.get('/my', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Getting transactions for user:', req.user.id);
    
    const query = `
      SELECT 
        t.id,
        t.amount,
        t.description,
        t.transaction_date as date,
        t.receipt_path,
        t.status,
        c.name as category,
        t.store_name,
        t.created_at
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `;
    
    const result = await getMany(query, [req.user.id]);
    
    if (!result.success) {
      console.error('❌ Error fetching user transactions:', result.error);
      return res.status(500).json({
        success: false,
        message: 'שגיאה בטעינת העסקאות'
      });
    }
    
    console.log('✅ Found', result.data.length, 'transactions for user');
    
    res.json({
      success: true,
      transactions: result.data
    });
    
  } catch (error) {
    console.error('❌ Error in /my endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

module.exports = router;
