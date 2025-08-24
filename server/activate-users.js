const mysql = require('mysql2/promise');
require('dotenv').config();

async function activateUsers() {
    let connection;
    
    try {
        console.log('🔄 Connecting to MySQL database...');
        
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'petty_cash',
            port: process.env.DB_PORT || 3306,
            charset: 'utf8mb4'
        });

        console.log('✅ Connected to database');

        // Activate all users
        console.log('\n🔧 Activating all users...');
        const [result] = await connection.execute('UPDATE users SET is_active = 1 WHERE is_active = 0');
        
        console.log(`✅ Activated ${result.affectedRows} users`);

        // Verify the changes
        console.log('\n📋 Updated user status:');
        const [users] = await connection.execute('SELECT id, full_name, email, is_active, role FROM users');
        console.table(users);

        const activeUsers = users.filter(user => user.is_active);
        const inactiveUsers = users.filter(user => !user.is_active);
        
        console.log(`\n✅ Active users: ${activeUsers.length}`);
        console.log(`⚠️ Inactive users: ${inactiveUsers.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

activateUsers();
