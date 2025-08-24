const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAdminUser() {
    let connection;
    try {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'petty_cash_db',
            port: process.env.DB_PORT || 3306,
            charset: 'utf8mb4'
        };

        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Check if admin user exists
        const [adminUsers] = await connection.execute(
            "SELECT id, username, email, full_name, role, is_active FROM users WHERE role = 'admin'"
        );

        console.log('📊 Admin users found:', adminUsers.length);

        if (adminUsers.length > 0) {
            adminUsers.forEach(admin => {
                console.log(`✅ Admin user: ${admin.username} (${admin.email}) - Active: ${admin.is_active}`);
            });
        } else {
            console.log('❌ No admin users found!');
            console.log('Creating default admin user...');

            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash('admin123', 12);

            await connection.execute(
                `INSERT INTO users (username, email, password_hash, full_name,  department, role, is_active) 
                 VALUES (?, ?, ?, ?,  ?, ?, ?)`,
                ['admin', 'admin@company.com', hashedPassword, 'System Administrator', 'Management', 'admin', true]
            );

            console.log('✅ Default admin user created');
            console.log('Username: admin');
            console.log('Password: admin123');
            console.log('Email: admin@company.com');
        }

        // Check users table structure
        const [columns] = await connection.execute(
            "DESCRIBE users"
        );

        console.log('\n📋 Users table structure:');
        columns.forEach(col => {
            console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(Required)' : '(Optional)'}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkAdminUser();
