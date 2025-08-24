require('dotenv').config();
const mysql = require('mysql2/promise');

// Database connection
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'petty_cash_db',
    charset: 'utf8mb4'
};

async function createTestRequest() {
    let connection;
    try {
        console.log('🔍 Creating test special request...');
        connection = await mysql.createConnection(dbConfig);
        
        // Create a new test request for user 21 (ישראל)
        const [result] = await connection.execute(
            `INSERT INTO special_expense_requests (user_id, amount, purpose, justification) 
             VALUES (?, ?, ?, ?)`,
            [21, 200, 'בדיקת עדכון יתרה', 'בקשה לבדיקת תהליך עדכון היתרה אחרי אישור']
        );
        
        console.log(`✅ Created test request with ID: ${result.insertId}`);
        console.log(`💡 You can now approve this request to test the balance update functionality`);
        console.log(`🔗 Request ID: ${result.insertId}`);
        
        // Show current user balance before approval
        const [userResult] = await connection.execute(
            `SELECT full_name, monthly_budget FROM users WHERE id = 21`
        );
        
        if (userResult.length > 0) {
            console.log(`👤 User: ${userResult[0].full_name}`);
            console.log(`💰 Current balance before approval: ₪${userResult[0].monthly_budget}`);
            console.log(`🎯 Expected balance after approval: ₪${parseFloat(userResult[0].monthly_budget) + 200}`);
        }
        
    } catch (error) {
        console.error('❌ Error creating test request:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createTestRequest();
