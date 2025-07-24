const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdminUser() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'petty_cash_db',
            port: process.env.DB_PORT || 3306,
            charset: 'utf8mb4'
        });

        console.log('✅ Connected to database');

        // Check if users table exists, create if not
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                employee_id VARCHAR(20) UNIQUE NOT NULL,
                department VARCHAR(50) NOT NULL,
                role ENUM('admin', 'client') DEFAULT 'client',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL
            ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);

        console.log('✅ Users table ready');

        // Check if admin user already exists
        const [existingAdmin] = await connection.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            ['admin', 'admin@company.com']
        );

        if (existingAdmin.length > 0) {
            console.log('ℹ️  Admin user already exists');
            return;
        }

        // Hash password for admin
        const adminPassword = 'admin123';
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

        // Create admin user
        await connection.execute(`
            INSERT INTO users (username, email, password_hash, full_name, employee_id, department, role, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'admin',
            'admin@company.com',
            hashedPassword,
            'System Administrator',
            'ADMIN001',
            'IT',
            'admin',
            true
        ]);

        console.log('✅ Admin user created successfully!');
        console.log('📋 Login credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');

        // Create a demo client user as well
        const clientPassword = 'user123';
        const hashedClientPassword = await bcrypt.hash(clientPassword, saltRounds);

        await connection.execute(`
            INSERT INTO users (username, email, password_hash, full_name, employee_id, department, role, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            'user',
            'user@company.com',
            hashedClientPassword,
            'Demo User',
            'EMP001',
            'Sales',
            'client',
            true
        ]);

        console.log('✅ Demo client user created successfully!');
        console.log('📋 Client login credentials:');
        console.log('   Username: user');
        console.log('   Password: user123');

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the function
createAdminUser()
    .then(() => {
        console.log('🎉 Setup completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Setup failed:', error);
        process.exit(1);
    });
