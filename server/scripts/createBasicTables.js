const mysql = require('mysql2/promise');
require('dotenv').config();

async function createBasicTables() {
  let connection;
  
  try {
    console.log('🔌 מתחבר ל-MySQL...');
    
    // התחברות ל-MySQL ללא בסיס נתונים ספציפי
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT || 3306,
      charset: 'utf8mb4'
    });
    
    console.log('✅ התחברות ל-MySQL הצליחה');
    
    // יצירת בסיס הנתונים
    await connection.execute(`
      CREATE DATABASE IF NOT EXISTS petty_cash_db 
      CHARACTER SET utf8mb4 
      COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ בסיס הנתונים נוצר');
    
    // שימוש בבסיס הנתונים
    await connection.execute('USE petty_cash_db');
    console.log('✅ עבר לבסיס הנתונים petty_cash_db');
    
    // יצירת טבלת משתמשים
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        department VARCHAR(50) NOT NULL,
        role ENUM('admin', 'client') DEFAULT 'client',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_department (department),
        INDEX idx_role (role),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ טבלת users נוצרה');
    
    // יצירת טבלת קטגוריות
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#2196F3',
        budget_limit DECIMAL(10,2) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_name (name),
        INDEX idx_active (is_active),
        INDEX idx_budget_limit (budget_limit)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ טבלת categories נוצרה');
    
    // יצירת טבלת עסקאות
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        category_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        transaction_date DATE NOT NULL,
        receipt_path VARCHAR(500) NULL,
        store_name VARCHAR(200) NULL,
        ocr_data JSON NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        approved_by INT NULL,
        approved_at TIMESTAMP NULL,
        rejection_reason TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        
        INDEX idx_user_id (user_id),
        INDEX idx_category_id (category_id),
        INDEX idx_transaction_date (transaction_date),
        INDEX idx_status (status),
        INDEX idx_approved_by (approved_by),
        INDEX idx_user_date (user_id, transaction_date),
        INDEX idx_category_date (category_id, transaction_date)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ טבלת transactions נוצרה');
    
    // יצירת טבלת לוג פעילות
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        action VARCHAR(100) NOT NULL,
        details JSON NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        
        INDEX idx_user_id (user_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),
        INDEX idx_user_date (user_id, created_at)
      ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('✅ טבלת activity_log נוצרה');
    
    // הוספת משתמש admin ברירת מחדל
    const adminPassword = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS'; // admin123
    await connection.execute(`
      INSERT IGNORE INTO users (username, email, password_hash, full_name,  department, role) 
      VALUES ('admin', 'admin@company.com', ?, 'System Administrator', 'Management', 'admin')
    `, [adminPassword]);
    console.log('✅ משתמש admin נוצר');
    
    // הוספת קטגוריות ברירת מחדל
    const categories = [
      ['אוכל ומשקאות', 'ארוחות, חטיפים ומשקאות לעובדים', '#FF9800', 1000.00],
      ['תחבורה', 'נסיעות עבודה, דלק וחניה', '#2196F3', 800.00],
      ['ציוד משרדי', 'כלי כתיבה, נייר וציוד משרדי', '#4CAF50', 500.00],
      ['אירוח לקוחות', 'פגישות עסקיות ואירוח לקוחות', '#9C27B0', 1500.00],
      ['הדרכות וכנסים', 'פיתוח מקצועי וכנסים', '#FF5722', 2000.00],
      ['בריאות ורווחה', 'מוצרי היגיינה ויוזמות רווחה', '#00BCD4', 300.00],
      ['תקשורת', 'טלפון, אינטרנט ושירותי דואר', '#795548', 400.00],
      ['שונות', 'הוצאות עסקיות אחרות שלא מסווגות במקום אחר', '#607D8B', 500.00]
    ];
    
    for (const [name, description, color, budget] of categories) {
      await connection.execute(`
        INSERT IGNORE INTO categories (name, description, color, budget_limit) 
        VALUES (?, ?, ?, ?)
      `, [name, description, color, budget]);
    }
    console.log('✅ קטגוריות ברירת מחדל נוצרו');
    
    // בדיקה שהטבלאות נוצרו
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 טבלאות שנוצרו:');
    tables.forEach(table => {
      console.log(`  - ${Object.values(table)[0]}`);
    });
    
    // בדיקה שהמשתמש הדמו קיים
    const [users] = await connection.execute('SELECT username, role FROM users');
    console.log('👥 משתמשים במערכת:');
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.role})`);
    });
    
    // בדיקה שהקטגוריות נוצרו
    const [cats] = await connection.execute('SELECT name FROM categories');
    console.log('📂 קטגוריות במערכת:');
    cats.forEach(cat => {
      console.log(`  - ${cat.name}`);
    });
    
    console.log('🎉 הגדרת בסיס הנתונים הושלמה בהצלחה!');
    console.log('💡 כעת ניתן להתחבר עם: admin / admin123');
    
  } catch (error) {
    console.error('❌ שגיאה בהגדרת בסיס הנתונים:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 חיבור ל-MySQL נסגר');
    }
  }
}

// הרצת הסקריפט
createBasicTables();
