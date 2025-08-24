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

async function testSpecialRequestsView() {
    let connection;
    try {
        console.log('🔍 Testing special_requests_detailed view...');
        connection = await mysql.createConnection(dbConfig);
        
        // Test if view exists
        console.log('📋 Checking if view exists...');
        const [views] = await connection.execute(
            `SHOW FULL TABLES WHERE Table_type = 'VIEW' AND Tables_in_petty_cash_db = 'special_requests_detailed'`
        );
        
        if (views.length === 0) {
            console.log('❌ View special_requests_detailed does not exist!');
            return;
        }
        
        console.log('✅ View exists');
        
        // Test selecting from view
        console.log('📊 Testing SELECT from view...');
        const [requests] = await connection.execute(
            `SELECT * FROM special_requests_detailed LIMIT 5`
        );
        
        console.log('✅ View query successful');
        console.log('📝 Found', requests.length, 'requests');
        console.log('📄 Sample request:', requests[0] || 'No requests found');
        
        // Test pending requests specifically
        console.log('📊 Testing pending requests...');
        const [pendingRequests] = await connection.execute(
            `SELECT * FROM special_requests_detailed WHERE status = 'pending'`
        );
        
        console.log('✅ Pending requests query successful');
        console.log('📝 Found', pendingRequests.length, 'pending requests');
        
    } catch (error) {
        console.error('❌ Error testing view:', error);
        console.error('Error details:', error.message);
        console.error('Error code:', error.code);
        console.error('Error stack:', error.stack);
    } finally {
        if (connection) await connection.end();
    }
}

testSpecialRequestsView();
