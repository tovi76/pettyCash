const { testConnection } = require('./config/database');
const mysql = require('mysql2/promise');

async function checkTables() {
    try {
        // Use the same config as the server
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'petty_cash_db',
            port: process.env.DB_PORT || 3306,
            charset: 'utf8mb4'
        };

        const connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to database');

        // Check if special_expense_requests table exists
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'special_expense_requests'"
        );

        if (tables.length > 0) {
            console.log('✅ special_expense_requests table already exists');
        } else {
            console.log('❌ special_expense_requests table does not exist');
            console.log('Creating table...');
            
            // Create the table
            const createTableSQL = `
                CREATE TABLE special_expense_requests (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    amount DECIMAL(10,2) NOT NULL,
                    purpose TEXT NOT NULL,
                    justification TEXT NULL,
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    admin_id INT NULL,
                    admin_notes TEXT NULL,
                    approved_at TIMESTAMP NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
                    
                    INDEX idx_user_id (user_id),
                    INDEX idx_status (status),
                    INDEX idx_admin_id (admin_id),
                    INDEX idx_created_at (created_at),
                    INDEX idx_user_status (user_id, status)
                ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            `;

            await connection.execute(createTableSQL);
            console.log('✅ special_expense_requests table created');

            // Create view
            const createViewSQL = `
                CREATE OR REPLACE VIEW special_requests_detailed AS
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
                    u.full_name as full_name,
                    u.email as user_email,
                    admin.full_name as admin_name
                FROM special_expense_requests sr
                JOIN users u ON sr.user_id = u.id
                LEFT JOIN users admin ON sr.admin_id = admin.id
            `;

            await connection.execute(createViewSQL);
            console.log('✅ special_requests_detailed view created');
        }

        await connection.end();
        console.log('✅ Database check completed');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Load environment variables
require('dotenv').config();
checkTables();
