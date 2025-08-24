const mysql = require('mysql2/promise');

async function checkUsersTable() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'petty_cash_db'
    });

    console.log('🔗 Connected to database');

    // Check users table structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'petty_cash_db']);

    console.log('\n📊 Current users table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(Required)' : '(Optional)'} ${col.EXTRA ? `[${col.EXTRA}]` : ''}`);
    });

    // Check if there are any users in the table
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`\n👥 Total users in table: ${users[0].count}`);

    // Show sample user data
    if (users[0].count > 0) {
      const [sampleUsers] = await connection.execute('SELECT id, username, email, full_name, department, role FROM users LIMIT 3');
      console.log('\n📋 Sample users:');
      sampleUsers.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Name: ${user.full_name}, Dept: ${user.department}, Role: ${user.role}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking users table:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the script
checkUsersTable();
