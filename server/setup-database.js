const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    let connection;
    
    try {
        console.log('🔄 Connecting to MySQL server...');
        
        // Connect without specifying database first
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            port: process.env.DB_PORT || 3306,
            charset: 'utf8mb4'
        });

        console.log('✅ Connected to MySQL server');

        // Read and execute schema file
        const schemaPath = path.join(__dirname, 'database', 'schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');
        
        console.log('🔄 Creating database and tables...');
        
        // Split by semicolon and execute each statement
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await connection.execute(statement);
                } catch (error) {
                    // Ignore "database exists" and similar warnings
                    if (!error.message.includes('already exists')) {
                        console.warn('Warning:', error.message);
                    }
                }
            }
        }

        console.log('✅ Database setup completed successfully!');
        console.log('📊 Database name:', process.env.DB_NAME || 'petty_cash_db');
        
        // Test the connection with the new database
        await connection.execute(`USE ${process.env.DB_NAME || 'petty_cash_db'}`);
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📋 Created ${tables.length} tables`);
        
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Solutions:');
            console.log('1. Install MySQL Server: https://dev.mysql.com/downloads/mysql/');
            console.log('2. Install XAMPP: https://www.apachefriends.org/');
            console.log('3. Make sure MySQL service is running');
            console.log('4. Check your .env file settings');
        }
        
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run setup
setupDatabase();
