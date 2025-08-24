const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'petty_cash_db',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    timezone: '+03:00' // Israel timezone
};

// Create connection pool
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    idleTimeout: 60000,
    acquireTimeout: 60000
});

// Test database connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
}

// Execute query with error handling
async function executeQuery(query, params = []) {
    try {
        const [results] = await pool.query(query, params);
        return { success: true, data: results };
    } catch (error) {
        console.error('Database query error:', error);
        return { success: false, error: error.message };
    }
}

// Get single record
async function getOne(query, params = []) {
    const result = await executeQuery(query, params);
    if (result.success && result.data.length > 0) {
        return { success: true, data: result.data[0] };
    }
    return { success: false, data: null };
}

// Get multiple records
async function getMany(query, params = []) {
    return await executeQuery(query, params);
}

// Insert record
async function insert(query, params = []) {
    const result = await executeQuery(query, params);
    if (result.success) {
        return { success: true, insertId: result.data.insertId };
    }
    return result;
}

// Update record
async function update(query, params = []) {
    const result = await executeQuery(query, params);
    if (result.success) {
        return { success: true, affectedRows: result.data.affectedRows };
    }
    return result;
}

module.exports = {
    pool,
    testConnection,
    executeQuery,
    getOne,
    getMany,
    insert,
    update
};
