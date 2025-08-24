const { executeQuery } = require('./config/database');

async function checkCategories() {
  console.log('🔍 בודק קטגוריות במסד הנתונים...');
  
  try {
    const result = await executeQuery(`
      SELECT id, name, color, is_active
      FROM categories 
      WHERE is_active = TRUE
      ORDER BY name
    `);
    
    if (result.success) {
      console.log('📊 קטגוריות זמינות:');
      result.data.forEach(cat => {
        console.log(`   ID: ${cat.id} - ${cat.name} (${cat.color})`);
      });
    } else {
      console.error('❌ שגיאה:', result.error);
    }
  } catch (error) {
    console.error('❌ שגיאה:', error);
  }
  
  process.exit(0);
}

checkCategories();
