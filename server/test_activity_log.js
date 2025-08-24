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

async function testActivityLog() {
    let connection;
    try {
        console.log('🔍 Testing activity_log table...');
        connection = await mysql.createConnection(dbConfig);
        
        // Check if activity_log table exists
        console.log('📋 Checking if activity_log table exists...');
        const [tables] = await connection.execute(
            `SHOW TABLES LIKE 'activity_log'`
        );
        
        if (tables.length === 0) {
            console.log('❌ activity_log table does not exist!');
            console.log('🔧 Creating activity_log table...');
            
            await connection.execute(`
                CREATE TABLE activity_log (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    action VARCHAR(50) NOT NULL,
                    entity_type VARCHAR(50),
                    entity_id INT,
                    old_values JSON,
                    new_values JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                ) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
            `);
            
            console.log('✅ activity_log table created');
        } else {
            console.log('✅ activity_log table exists');
        }
        
        // Test inserting a record
        console.log('🧪 Testing insert into activity_log...');
        const [result] = await connection.execute(
            `INSERT INTO activity_log (user_id, action, entity_type, entity_id, new_values) 
             VALUES (?, 'test', 'test', ?, ?)`,
            [1, 999, JSON.stringify({ test: 'data' })]
        );
        
        console.log('✅ Insert successful, ID:', result.insertId);
        
        // Clean up test record
        await connection.execute(
            `DELETE FROM activity_log WHERE id = ?`,
            [result.insertId]
        );
        
        console.log('✅ Test record cleaned up');
        
        // Check recent activity logs
        console.log('📊 Recent activity logs:');
        const [logs] = await connection.execute(
            `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 5`
        );
        
        logs.forEach(log => {
            console.log(`  📝 ${log.created_at} | User: ${log.user_id} | Action: ${log.action} | Entity: ${log.entity_type}:${log.entity_id}`);
        });
        
    } catch (error) {
        console.error('❌ Error testing activity_log:', error);
        console.error('Error details:', error.message);
        console.error('Error code:', error.code);
    } finally {
        if (connection) await connection.end();
    }
}

testActivityLog();
