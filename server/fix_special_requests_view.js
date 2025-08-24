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

async function fixSpecialRequestsView() {
    let connection;
    try {
        console.log('🔧 Fixing special_requests_detailed view...');
        connection = await mysql.createConnection(dbConfig);
        
        // Drop existing view
        console.log('🗑️ Dropping existing view...');
        await connection.execute(`DROP VIEW IF EXISTS special_requests_detailed`);
        
        // Create updated view with correct field names
        console.log('🆕 Creating updated view...');
        await connection.execute(`
            CREATE VIEW special_requests_detailed AS
            SELECT 
                sr.id,
                sr.amount,
                sr.purpose,
                sr.justification,
                sr.status,
                sr.admin_notes,
                sr.approved_at,
                sr.created_at,
                sr.updated_at,
                u.full_name,
                u.email as user_email,
                admin.full_name as admin_name
            FROM special_expense_requests sr
            JOIN users u ON sr.user_id = u.id
            LEFT JOIN users admin ON sr.admin_id = admin.id
        `);
        
        console.log('✅ View updated successfully');
        
        // Test the updated view
        console.log('🧪 Testing updated view...');
        const [requests] = await connection.execute(
            `SELECT * FROM special_requests_detailed LIMIT 1`
        );
        
        console.log('📄 Sample request with updated fields:', requests[0] || 'No requests found');
        
        if (requests[0]) {
            console.log('🔍 Checking field names:');
            console.log('  - full_name:', requests[0].full_name ? '✅' : '❌');
            console.log('  - user_email:', requests[0].user_email ? '✅' : '❌');
            console.log('  - admin_name:', requests[0].admin_name !== undefined ? '✅' : '❌');
        }
        
    } catch (error) {
        console.error('❌ Error fixing view:', error);
        console.error('Error details:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixSpecialRequestsView();
