const { executeQuery } = require('./config/database');

async function checkTransactions() {
  console.log('🔍 בודק טרנזקציות במסד הנתונים...');
  
  try {
    // First check table structure
    const tableStructure = await executeQuery(`DESCRIBE transactions`);
    if (tableStructure.success) {
      console.log('📋 מבנה טבלת transactions:');
      tableStructure.data.forEach(col => {
        console.log(`   ${col.Field}: ${col.Type}`);
      });
      console.log('');
    }
    
    // Check all transactions
    const allTransactions = await executeQuery(`
      SELECT 
        t.id,
        t.user_id,
        u.full_name,
        u.email,
        t.amount,
        t.transaction_date,
        t.description,
        MONTH(t.transaction_date) as month,
        YEAR(t.transaction_date) as year
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.transaction_date DESC
      LIMIT 20
    `);
    
    if (allTransactions.success) {
      console.log('📊 כל הטרנזקציות (20 האחרונות):');
      if (allTransactions.data.length === 0) {
        console.log('❌ אין טרנזקציות במסד הנתונים!');
      } else {
        allTransactions.data.forEach(t => {
          console.log(`💳 ${t.full_name}: ₪${t.amount} - ${t.description} (${t.transaction_date})`);
        });
      }
      console.log('');
    }
    
    // Check current month transactions
    const currentMonth = await executeQuery(`
      SELECT 
        t.user_id,
        u.full_name,
        COUNT(*) as transaction_count,
        SUM(t.amount) as total_amount
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE MONTH(t.transaction_date) = MONTH(CURRENT_DATE()) 
      AND YEAR(t.transaction_date) = YEAR(CURRENT_DATE())
      GROUP BY t.user_id, u.full_name
      ORDER BY u.full_name
    `);
    
    if (currentMonth.success) {
      console.log('📅 טרנזקציות החודש הנוכחי:');
      if (currentMonth.data.length === 0) {
        console.log('❌ אין טרנזקציות החודש!');
      } else {
        currentMonth.data.forEach(user => {
          console.log(`👤 ${user.full_name}: ${user.transaction_count} טרנזקציות, סה"כ ₪${user.total_amount}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ שגיאה:', error);
  }
  
  process.exit(0);
}

checkTransactions();
