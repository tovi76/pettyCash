const mysql = require('mysql2/promise');

async function createSpecialRequestsTable() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'petty_cash_db'
        });

        console.log('✅ Connected to database');

        // Create special_expense_requests table
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS special_expense_requests (
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
        console.log('✅ Special expense requests table created successfully');

        // Create view for detailed requests
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
        console.log('✅ Special requests view created successfully');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

createSpecialRequestsTable();
