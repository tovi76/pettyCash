const express = require('express');
const ExcelJS = require('exceljs');
const { query, validationResult } = require('express-validator');
const { getOne, getMany, execute } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const requireRole = require('../middleware/auth').requireRole;
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Helper function to calculate optimal allocation
const calculateOptimalAllocation = async (startDate, endDate) => {
  try {
    // Get all users and their transaction data
    const usersQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.department,
        u.username,
        COUNT(t.id) as transaction_count,
        COALESCE(SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END), 0) as approved_amount,
        COALESCE(SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END), 0) as pending_amount,
        COALESCE(AVG(t.amount), 0) as average_amount
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id 
        AND t.transaction_date BETWEEN ? AND ?
      WHERE u.role = 'client' AND u.is_active = true
      GROUP BY u.id
      ORDER BY approved_amount DESC
    `;

    const usersResult = await getMany(usersQuery, [startDate, endDate]);
    if (!usersResult.success) return null;

    const users = usersResult.data;
    const totalBudget = users.reduce((sum, user) => sum + user.approved_amount, 0);
    const averageSpending = totalBudget / users.length;

    // Calculate optimization recommendations
    const recommendations = users.map(user => {
      const currentAllocation = user.approved_amount;
      const departmentFactor = getDepartmentFactor(user.department);
      const performanceFactor = getPerformanceFactor(user.transaction_count, user.average_amount);
      
      // Calculate optimal allocation based on department needs and performance
      const optimalAllocation = Math.round(averageSpending * departmentFactor * performanceFactor);
      const difference = optimalAllocation - currentAllocation;
      
      return {
        user_id: user.id,
        username: user.username,
        full_name: user.full_name,
        department: user.department,
        current_allocation: currentAllocation,
        optimal_allocation: optimalAllocation,
        difference: difference,
        efficiency_score: Math.round((optimalAllocation / (currentAllocation || 1)) * 100),
        recommendation: getRecommendationText(difference, user.department)
      };
    });

    const totalSavings = recommendations.reduce((sum, rec) => sum + Math.max(0, -rec.difference), 0);
    const totalIncrease = recommendations.reduce((sum, rec) => sum + Math.max(0, rec.difference), 0);
    const netSavings = totalSavings - totalIncrease;
    const overallEfficiency = Math.round(((totalBudget - Math.abs(netSavings)) / totalBudget) * 100);

    return {
      total_budget: totalBudget,
      total_savings: totalSavings,
      total_increase: totalIncrease,
      net_savings: netSavings,
      overall_efficiency: overallEfficiency,
      recommendations: recommendations
    };

  } catch (error) {
    console.error('Optimal allocation calculation error:', error);
    return null;
  }
};

// Helper functions for optimization
const getDepartmentFactor = (department) => {
  const factors = {
    'מכירות': 1.3,
    'שיווק': 1.2,
    'פיתוח': 1.0,
    'כספים': 0.8,
    'משאבי אנוש': 0.9,
    'תפעול': 1.1
  };
  return factors[department] || 1.0;
};

const getPerformanceFactor = (transactionCount, averageAmount) => {
  if (transactionCount === 0) return 0.7;
  if (transactionCount > 20) return 1.2;
  if (transactionCount > 10) return 1.1;
  if (averageAmount > 100) return 1.15;
  return 1.0;
};

const getRecommendationText = (difference, department) => {
  if (difference > 0) {
    return `הגדלת תקציב ב-₪${difference} בהתאם לצרכי מחלקת ${department}`;
  } else if (difference < 0) {
    return `הפחתת תקציב ב-₪${Math.abs(difference)} לשיפור יעילות`;
  }
  return 'תקציב אופטימלי - ללא שינוי נדרש';
};

// Monthly summary report
router.get('/monthly', authenticateToken, [
  query('year').isInt({ min: 2020, max: 2030 }).withMessage('שנה לא תקינה'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('חודש לא תקין')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'פרמטרים לא תקינים',
        errors: errors.array()
      });
    }

    const { year, month } = req.query;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(DISTINCT user_id) as active_users,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as rejected_amount,
        AVG(amount) as average_amount
      FROM transactions
      WHERE transaction_date BETWEEN ? AND ?
    `;

    // Get category breakdown
    const categoryQuery = `
      SELECT 
        c.name,
        c.color,
        c.budget_limit,
        COUNT(t.id) as transaction_count,
        SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END) as pending_amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.transaction_date BETWEEN ? AND ?
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY approved_amount DESC
    `;

    // Get user breakdown
    const userQuery = `
      SELECT 
        u.full_name,
        u.department,
        u.username,
        COUNT(t.id) as transaction_count,
        SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END) as pending_amount
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id 
        AND t.transaction_date BETWEEN ? AND ?
      WHERE u.role = 'client' AND u.is_active = true
      GROUP BY u.id
      ORDER BY approved_amount DESC
    `;

    const [summaryResult, categoryResult, userResult] = await Promise.all([
      getOne(summaryQuery, [startDate, endDate]),
      getMany(categoryQuery, [startDate, endDate]),
      getMany(userQuery, [startDate, endDate])
    ]);

    if (!summaryResult.success || !categoryResult.success || !userResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת נתוני הדוח'
      });
    }

    res.json({
      success: true,
      data: {
        period: { year: parseInt(year), month: parseInt(month) },
        summary: summaryResult.data,
        categories: categoryResult.data,
        users: userResult.data
      }
    });

  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Optimization report
router.get('/optimization', authenticateToken, requireRole('admin'), [
  query('start_date').isISO8601().withMessage('תאריך התחלה לא תקין'),
  query('end_date').isISO8601().withMessage('תאריך סיום לא תקין')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'פרמטרים לא תקינים',
        errors: errors.array()
      });
    }

    const { start_date, end_date } = req.query;
    const optimizationData = await calculateOptimalAllocation(start_date, end_date);

    if (!optimizationData) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בחישוב האופטימיזציה'
      });
    }

    res.json({
      success: true,
      data: {
        period: { start_date, end_date },
        optimization: optimizationData
      }
    });

  } catch (error) {
    console.error('Optimization report error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Export monthly report to Excel
router.get('/export/monthly', authenticateToken, requireRole('admin'), [
  query('year').isInt({ min: 2020, max: 2030 }).withMessage('שנה לא תקינה'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('חודש לא תקין')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'פרמטרים לא תקינים',
        errors: errors.array()
      });
    }

    const { year, month } = req.query;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-31`;

    // Get data for Excel export
    const transactionsQuery = `
      SELECT 
        t.id,
        t.amount,
        t.description,
        t.transaction_date,
        t.store_name,
        t.status,
        t.created_at,
        u.full_name,
        u.username,
        u.department,
        c.name as category_name
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.transaction_date BETWEEN ? AND ?
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `;

    const transactionsResult = await getMany(transactionsQuery, [startDate, endDate]);

    if (!transactionsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת נתונים ליצוא'
      });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'מערכת קופה קטנה';
    workbook.created = new Date();

    // Add transactions sheet
    const transactionsSheet = workbook.addWorksheet('עסקאות');
    
    // Set RTL
    transactionsSheet.views = [{ rightToLeft: true }];

    // Add headers
    transactionsSheet.addRow([
      'מספר עסקה', 'תאריך', 'עובד', 'מחלקה', 'מספר עובד', 
      'קטגוריה', 'תיאור', 'חנות', 'סכום', 'סטטוס', 'תאריך יצירה'
    ]);

    // Style headers
    const headerRow = transactionsSheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1565C0' }
    };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add data rows
    transactionsResult.data.forEach(transaction => {
      const row = transactionsSheet.addRow([
        transaction.id,
        new Date(transaction.transaction_date),
        transaction.full_name,
        transaction.department,
        transaction.category_name,
        transaction.description,
        transaction.store_name || '',
        transaction.amount,
        transaction.status === 'approved' ? 'אושר' : 
        transaction.status === 'pending' ? 'ממתין' : 'נדחה',
        new Date(transaction.created_at)
      ]);

      // Color code by status
      if (transaction.status === 'approved') {
        row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
      } else if (transaction.status === 'rejected') {
        row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEAEA' } };
      }
    });

    // Auto-fit columns
    transactionsSheet.columns.forEach(column => {
      column.width = 15;
    });

    // Add summary sheet
    const summarySheet = workbook.addWorksheet('סיכום');
    summarySheet.views = [{ rightToLeft: true }];

    // Calculate summary data
    const totalApproved = transactionsResult.data
      .filter(t => t.status === 'approved')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalPending = transactionsResult.data
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    // Add summary data
    summarySheet.addRow(['דוח חודשי - סיכום']);
    summarySheet.addRow([]);
    summarySheet.addRow(['תקופה:', `${month}/${year}`]);
    summarySheet.addRow(['סה"כ עסקאות:', transactionsResult.data.length]);
    summarySheet.addRow(['סה"כ מאושר:', `₪${totalApproved.toLocaleString()}`]);
    summarySheet.addRow(['סה"כ ממתין:', `₪${totalPending.toLocaleString()}`]);

    // Style summary
    summarySheet.getCell('A1').font = { bold: true, size: 16 };
    summarySheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    summarySheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 16 };

    // Generate file
    const fileName = `דוח_חודשי_${month}_${year}.xlsx`;
    const filePath = path.join(__dirname, '../temp', fileName);

    // Ensure temp directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await workbook.xlsx.writeFile(filePath);

    // Send file
    res.download(filePath, fileName, async (err) => {
      if (err) {
        console.error('File download error:', err);
      }
      
      // Clean up file after download
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    });

  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצוא הדוח'
    });
  }
});

// Export optimization report to Excel
router.get('/export/optimization', authenticateToken, requireRole('admin'), [
  query('start_date').isISO8601().withMessage('תאריך התחלה לא תקין'),
  query('end_date').isISO8601().withMessage('תאריך סיום לא תקין')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'פרמטרים לא תקינים',
        errors: errors.array()
      });
    }

    const { start_date, end_date } = req.query;
    const optimizationData = await calculateOptimalAllocation(start_date, end_date);

    if (!optimizationData) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בחישוב האופטימיזציה'
      });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'מערכת קופה קטנה';
    workbook.created = new Date();

    // Add optimization sheet
    const optimizationSheet = workbook.addWorksheet('אופטימיזציה');
    optimizationSheet.views = [{ rightToLeft: true }];

    // Add title
    optimizationSheet.addRow(['דוח אופטימיזציה - המלצות לחלוקה אופטימלית']);
    optimizationSheet.addRow([]);
    optimizationSheet.addRow(['תקופה:', `${start_date} עד ${end_date}`]);
    optimizationSheet.addRow(['יעילות כוללת:', `${optimizationData.overall_efficiency}%`]);
    optimizationSheet.addRow(['חיסכון נטו:', `₪${optimizationData.net_savings.toLocaleString()}`]);
    optimizationSheet.addRow([]);

    // Add headers for recommendations
    optimizationSheet.addRow([
      'עובד', 'מחלקה', 'תקציב נוכחי', 'תקציב מומלץ', 
      'הפרש', 'ציון יעילות', 'המלצה'
    ]);

    // Style headers
    const headerRow = optimizationSheet.getRow(7);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
    headerRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Add recommendation data
    optimizationData.recommendations.forEach(rec => {
      const row = optimizationSheet.addRow([
        rec.full_name,
        rec.department,
        `₪${rec.current_allocation.toLocaleString()}`,
        `₪${rec.optimal_allocation.toLocaleString()}`,
        `₪${rec.difference.toLocaleString()}`,
        `${rec.efficiency_score}%`,
        rec.recommendation
      ]);

      // Color code by difference
      if (rec.difference > 0) {
        row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
      } else if (rec.difference < 0) {
        row.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
      }
    });

    // Auto-fit columns
    optimizationSheet.columns.forEach(column => {
      column.width = 18;
    });

    // Style title
    optimizationSheet.getCell('A1').font = { bold: true, size: 16 };
    optimizationSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
    optimizationSheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 16 };

    // Generate file
    const fileName = `דוח_אופטימיזציה_${start_date}_${end_date}.xlsx`;
    const filePath = path.join(__dirname, '../temp', fileName);

    // Ensure temp directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Write file
    await workbook.xlsx.writeFile(filePath);

    // Send file
    res.download(filePath, fileName, async (err) => {
      if (err) {
        console.error('File download error:', err);
      }
      
      // Clean up file after download
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('File cleanup error:', cleanupError);
      }
    });

  } catch (error) {
    console.error('Optimization export error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה ביצוא דוח האופטימיזציה'
    });
  }
});

// Dashboard statistics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-31`;

    let whereClause = 'WHERE transaction_date BETWEEN ? AND ?';
    let queryParams = [startDate, endDate];

    // Filter by user role
    if (req.user.role === 'client') {
      whereClause += ' AND user_id = ?';
      queryParams.push(req.user.id);
    }

    // Get current month statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(DISTINCT user_id) as active_users,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as rejected_amount,
        AVG(amount) as average_amount
      FROM transactions
      ${whereClause}
    `;

    // Get category breakdown for current month
    const categoryStatsQuery = `
      SELECT 
        c.name,
        c.color,
        COUNT(t.id) as transaction_count,
        SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END) as approved_amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.transaction_date BETWEEN ? AND ?
        ${req.user.role === 'client' ? 'AND t.user_id = ?' : ''}
      WHERE c.is_active = true
      GROUP BY c.id
      HAVING approved_amount > 0
      ORDER BY approved_amount DESC
      LIMIT 5
    `;

    let categoryParams = [startDate, endDate];
    if (req.user.role === 'client') {
      categoryParams.push(req.user.id);
    }

    const [statsResult, categoryStatsResult] = await Promise.all([
      getOne(statsQuery, queryParams),
      getMany(categoryStatsQuery, categoryParams)
    ]);

    if (!statsResult.success || !categoryStatsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת נתוני הדשבורד'
      });
    }

    res.json({
      success: true,
      data: {
        current_month: {
          month: currentMonth,
          year: currentYear,
          statistics: statsResult.data,
          top_categories: categoryStatsResult.data
        }
      }
    });

  } catch (error) {
    console.error('Dashboard statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

// Historical trends
router.get('/trends', authenticateToken, [
  query('months').optional().isInt({ min: 3, max: 24 }).withMessage('מספר חודשים לא תקין')
], async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    
    let whereClause = 'WHERE transaction_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)';
    let queryParams = [months];

    // Filter by user role
    if (req.user.role === 'client') {
      whereClause += ' AND user_id = ?';
      queryParams.push(req.user.id);
    }

    const trendsQuery = `
      SELECT 
        DATE_FORMAT(transaction_date, '%Y-%m') as month,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
        AVG(amount) as average_amount
      FROM transactions
      ${whereClause}
      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
      ORDER BY month ASC
    `;

    const trendsResult = await getMany(trendsQuery, queryParams);

    if (!trendsResult.success) {
      return res.status(500).json({
        success: false,
        message: 'שגיאה בשליפת נתוני המגמות'
      });
    }

    res.json({
      success: true,
      data: {
        period_months: months,
        trends: trendsResult.data
      }
    });

  } catch (error) {
    console.error('Trends report error:', error);
    res.status(500).json({
      success: false,
      message: 'שגיאה פנימית בשרת'
    });
  }
});

module.exports = router;
