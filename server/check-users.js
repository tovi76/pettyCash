const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
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

        // Check all users
        console.log('\n📋 All users in database:');
        const [users] = await connection.execute('SELECT id, full_name, email, is_active, role FROM users');
        console.table(users);

        // Check for deactivated users
        const deactivatedUsers = users.filter(user => !user.is_active);
        if (deactivatedUsers.length > 0) {
            console.log('\n⚠️ Deactivated users found:');
            console.table(deactivatedUsers);
            
            console.log('\n🔧 To reactivate all users, run:');
            console.log('UPDATE users SET is_active = 1;');
        } else {
            console.log('\n✅ All users are active');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

checkUsers();
