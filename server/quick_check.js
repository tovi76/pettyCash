const mysql = require('mysql2/promise');
require('dotenv').config();

async function quickCheck() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'petty_cash_db'
        });

        console.log ('מחובר למסד נתונים');

        // בדיקת שדות שחובה למלא
        const [result] = await connection.execute(`
            SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'petty_cash_db' 
            AND TABLE_NAME = 'users' 
            AND IS_NULLABLE = 'NO' 
            AND COLUMN_DEFAULT IS NULL
            AND EXTRA != 'auto_increment'
        `);

        console.log('\nשדות חובה שגורמים לבעיה:');
        if (result.length > 0) {
            result.forEach(col => {
                console.log(`❌ ${col.COLUMN_NAME}`);
            });
            
            console.log('\n🔧 מתקן את הבעיה...');
            
            // תיקון השדות הבעייתיים
            for (const col of result) {
                if (col.COLUMN_NAME === 'username') {
                    await connection.execute('ALTER TABLE users MODIFY COLUMN username VARCHAR(50) NULL DEFAULT NULL');
                    console.log('✅ username תוקן');
                }
                if (col.COLUMN_NAME === 'department') {
                    await connection.execute('ALTER TABLE users MODIFY COLUMN department VARCHAR(50) NULL DEFAULT NULL');
                    console.log('✅ department תוקן');
                }
            }
            
            console.log('\n🎉 כל השדות תוקנו! עכשיו נסה ליצור משתמש שוב.');
            
        } else {
            console.log('✅ אין שדות בעייתיים - הבעיה במקום אחר');
        }

    } catch (error) {
        console.error('שגיאה:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

quickCheck();