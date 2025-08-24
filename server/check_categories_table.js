const { executeQuery } = require('./config/database');

async function checkCategoriesTable() {
  console.log('🔍 בודק טבלת categories...');
  
  try {
    // Check if table exists
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'categories'
    `);
    
    if (tableExists.success) {
      console.log('📋 טבלת categories קיימת:', tableExists.data[0].count > 0);
      
      if (tableExists.data[0].count > 0) {
        // Check table structure
        const structure = await executeQuery(`DESCRIBE categories`);
        if (structure.success) {
          console.log('📊 מבנה טבלת categories:');
          structure.data.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type}`);
          });
        }
        
        // Check data
        const data = await executeQuery(`SELECT * FROM categories LIMIT 5`);
        if (data.success) {
          console.log('📝 נתונים בטבלת categories:');
          data.data.forEach(cat => {
            console.log(`   ID: ${cat.id}, Name: ${cat.name}, Color: ${cat.color}`);
          });
        }
      }
    }
    
    // Test the problematic query
    console.log('🧪 בודק את השאילתה הבעייתית...');
    const testQuery = `
      SELECT 
        t.id,
        t.amount,
        t.description,
        t.transaction_date,
        t.store_name,
        t.receipt_path,
        t.status,
        t.created_at,
        t.updated_at,
        u.email,
        u.full_name,
        u.monthly_budget,
        c.name as category_name,
        c.color as category_color
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
      ORDER BY t.created_at DESC
      LIMIT 20
    `;
    
    const testResult = await executeQuery(testQuery);
    if (testResult.success) {
      console.log('✅ השאילתה עובדת! מצאנו', testResult.data.length, 'טרנזקציות');
    } else {
      console.log('❌ השאילתה נכשלת:', testResult.error);
    }
    
  } catch (error) {
    console.error('❌ שגיאה:', error);
  }
  
  process.exit(0);
}

checkCategoriesTable();
