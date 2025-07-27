const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateDatabase() {
    let connection;
    
    try {
        // Create connection
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'petty_cash_db'
        });

        console.log('🔗 Connected to database');

        // Check if monthly_budget column exists
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'monthly_budget'
        `, [process.env.DB_NAME || 'petty_cash_db']);

        if (columns.length === 0) {
            console.log('➕ Adding monthly_budget column...');
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN monthly_budget DECIMAL(10,2) DEFAULT 1000.00 AFTER full_name
            `);
            console.log('✅ monthly_budget column added successfully');
        } else {
            console.log('✅ monthly_budget column already exists');
        }

        // Update existing users to have a default monthly budget if they don't have one
        console.log('🔄 Updating existing users with default budget...');
        const [result] = await connection.execute(`
            UPDATE users 
            SET monthly_budget = 1000.00 
            WHERE monthly_budget = 0.00 OR monthly_budget IS NULL
        `);
        console.log(`✅ Updated ${result.affectedRows} users with default budget`);

        // Show current users table structure
        console.log('📋 Current users table structure:');
        const [tableInfo] = await connection.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
            ORDER BY ORDINAL_POSITION
        `, [process.env.DB_NAME || 'petty_cash_db']);
        
        console.table(tableInfo);

        console.log('🎉 Database migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Database connection closed');
        }
    }
}

migrateDatabase();
