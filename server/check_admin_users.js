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

async function checkAdminUsers() {
    let connection;
    try {
        console.log('🔍 Checking admin users...');
        connection = await mysql.createConnection(dbConfig);
        
        // Get all users with their roles
        const [users] = await connection.execute(
            `SELECT id, email, full_name, role, is_active FROM users ORDER BY role, id`
        );
        
        console.log('👥 All users in system:');
        users.forEach(user => {
            const status = user.is_active ? '✅' : '❌';
            const roleIcon = user.role === 'admin' ? '👑' : '👤';
            console.log(`  ${roleIcon} ${status} ID: ${user.id} | ${user.email} | ${user.full_name} | Role: ${user.role}`);
        });
        
        const adminUsers = users.filter(user => user.role === 'admin' && user.is_active);
        console.log(`\n🎯 Found ${adminUsers.length} active admin users:`);
        adminUsers.forEach(admin => {
            console.log(`  👑 ${admin.email} (${admin.full_name}) - ID: ${admin.id}`);
        });
        
        if (adminUsers.length === 0) {
            console.log('⚠️ No active admin users found! Creating a test admin...');
            
            // Create a test admin user
            const [result] = await connection.execute(
                `INSERT INTO users (email, full_name, password, role, monthly_budget, is_active) 
                 VALUES (?, ?, ?, 'admin', 0, 1)`,
                ['admin@test.com', 'Test Administrator', '$2a$10$test.hash.for.password123', ]
            );
            
            console.log(`✅ Created test admin user with ID: ${result.insertId}`);
            console.log('📧 Email: admin@test.com');
            console.log('🔑 Password: admin123 (for testing)');
        }
        
    } catch (error) {
        console.error('❌ Error checking admin users:', error);
        console.error('Error details:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkAdminUsers();
