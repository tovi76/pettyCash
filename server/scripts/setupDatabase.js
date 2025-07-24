const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
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
    
    // קריאת קובץ ה-schema
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaContent = await fs.readFile(schemaPath, 'utf8');
    
    console.log('📄 קורא את קובץ ה-schema...');
    
    // פיצול הקובץ לפקודות נפרדות
    const statements = schemaContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔧 מבצע ${statements.length} פקודות SQL...`);
    
    // הרצת כל פקודה בנפרד
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.length > 0) {
        try {
          await connection.execute(statement);
          console.log(`✅ פקודה ${i + 1}/${statements.length} הושלמה`);
        } catch (error) {
          if (error.code === 'ER_DB_CREATE_EXISTS') {
            console.log(`ℹ️  בסיס הנתונים כבר קיים`);
          } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log(`ℹ️  טבלה כבר קיימת`);
          } else {
            console.error(`❌ שגיאה בפקודה ${i + 1}:`, error.message);
            console.error(`פקודה: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }
    
    console.log('🎉 הגדרת בסיס הנתונים הושלמה בהצלחה!');
    
    // בדיקה שהטבלאות נוצרו
    await connection.execute('USE petty_cash_db');
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
setupDatabase();
