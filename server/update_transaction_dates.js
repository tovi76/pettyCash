const { executeQuery } = require('./config/database');

async function updateTransactionDates() {
    try {
        console.log('🔄 Updating transaction dates to current month...');
        
        // Get current date in YYYY-MM-DD format
        const currentDate = new Date().toISOString().split('T')[0];
        console.log('📅 Setting all transactions to date:', currentDate);
        
        // Update all transactions to current date
        const result = await executeQuery(
            'UPDATE transactions SET transaction_date = ?',
            [currentDate]
        );
        
        if (result.success) {
            console.log('✅ Successfully updated transaction dates');
            console.log('📊 Affected rows:', result.data.affectedRows);
        } else {
            console.error('❌ Failed to update transaction dates:', result.error);
        }
        
        // Show updated transactions
        const transactions = await executeQuery('SELECT id, amount, description, transaction_date FROM transactions');
        if (transactions.success) {
            console.log('📝 Updated transactions:');
            transactions.data.forEach(t => {
                console.log(`- ID: ${t.id}, Amount: ${t.amount}, Date: ${t.transaction_date}, Description: ${t.description}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error updating transaction dates:', error);
    }
    
    process.exit(0);
}

updateTransactionDates();
