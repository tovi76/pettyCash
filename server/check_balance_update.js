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

async function checkBalanceUpdate() {
    let connection;
    try {
        console.log('🔍 Checking balance update functionality...');
        connection = await mysql.createConnection(dbConfig);
        
        // Check user 21 (ישראל) current balance
        console.log('\n👤 Checking user 21 (ישראל) current balance:');
        const [userResult] = await connection.execute(
            `SELECT id, full_name, email, monthly_budget FROM users WHERE id = 21`
        );
        
        if (userResult.length > 0) {
            const user = userResult[0];
            console.log(`  📊 User: ${user.full_name} (${user.email})`);
            console.log(`  💰 Current monthly_budget: ₪${user.monthly_budget}`);
        } else {
            console.log('  ❌ User 21 not found');
            return;
        }
        
        // Check recent approved special requests for this user
        console.log('\n📋 Recent approved special requests for user 21:');
        const [requests] = await connection.execute(
            `SELECT ser.*, srd.full_name, srd.user_email 
             FROM special_expense_requests ser
             LEFT JOIN special_requests_detailed srd ON ser.id = srd.id
             WHERE ser.user_id = 21 AND ser.status = 'approved' 
             ORDER BY ser.approved_at DESC LIMIT 5`
        );
        
        console.log(`  📊 Found ${requests.length} approved requests:`);
        let totalApprovedAmount = 0;
        requests.forEach(request => {
            console.log(`    🔸 ID: ${request.id} | Amount: ₪${request.amount} | Approved: ${request.approved_at} | Purpose: ${request.purpose}`);
            totalApprovedAmount += parseFloat(request.amount);
        });
        
        console.log(`  💸 Total approved amount: ₪${totalApprovedAmount}`);
        
        // Check balance update activity logs
        console.log('\n📝 Balance update activity logs:');
        const [logs] = await connection.execute(
            `SELECT * FROM activity_log 
             WHERE action = 'balance_update' AND entity_type = 'user' AND entity_id = '21'
             ORDER BY created_at DESC LIMIT 5`
        );
        
        console.log(`  📊 Found ${logs.length} balance update logs:`);
        logs.forEach(log => {
            const newValues = JSON.parse(log.new_values || '{}');
            console.log(`    🔸 ${log.created_at} | Amount added: ₪${newValues.amount_added} | Request: ${newValues.request_id}`);
        });
        
        // Calculate expected balance
        const originalBudget = 1000; // Assuming original budget is 1000
        const expectedBalance = originalBudget + totalApprovedAmount;
        const currentBalance = parseFloat(userResult[0].monthly_budget);
        
        console.log('\n⚖️ Balance Analysis:');
        console.log(`  🏦 Original budget: ₪${originalBudget}`);
        console.log(`  ➕ Total approved exceptions: ₪${totalApprovedAmount}`);
        console.log(`  🎯 Expected balance: ₪${expectedBalance}`);
        console.log(`  💰 Current balance: ₪${currentBalance}`);
        
        if (currentBalance === expectedBalance) {
            console.log('  ✅ Balance is correct!');
        } else {
            console.log('  ❌ Balance mismatch detected!');
            console.log(`  🔍 Difference: ₪${currentBalance - expectedBalance}`);
        }
        
    } catch (error) {
        console.error('❌ Error checking balance:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkBalanceUpdate();
