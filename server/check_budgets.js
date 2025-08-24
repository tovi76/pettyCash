const { executeQuery } = require('./config/database');

async function checkBudgets() {
  console.log('🔍 בודק ערכי תקציב במסד הנתונים...');
  
  try {
    const result = await executeQuery(`
      SELECT 
        id,
        email,
        full_name,
        monthly_budget,
        (
          SELECT COALESCE(SUM(amount), 0) 
          FROM transactions 
          WHERE user_id = users.id 
          AND MONTH(transaction_date) = MONTH(CURRENT_DATE()) 
          AND YEAR(transaction_date) = YEAR(CURRENT_DATE())
        ) as monthly_spent
      FROM users 
      WHERE is_active = TRUE
      ORDER BY id
    `);
    
    if (result.success) {
      console.log('📊 נתוני תקציב עובדים:');
      result.data.forEach(user => {
        const remaining = user.monthly_budget - user.monthly_spent;
        console.log(`👤 ${user.full_name} (${user.email}):`);
        console.log(`   תקציב חודשי: ₪${user.monthly_budget}`);
        console.log(`   הוצאות החודש: ₪${user.monthly_spent}`);
        console.log(`   יתרה נוכחית: ₪${remaining}`);
        console.log('');
      });
    } else {
      console.error('❌ שגיאה:', result.error);
    }
  } catch (error) {
    console.error('❌ שגיאה:', error);
  }
  
  process.exit(0);
}

checkBudgets();
