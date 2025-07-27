-- Migration script to update users table for simplified user model
-- This script adds monthly_budget column and removes unused columns

USE petty_cash_db;

-- Add monthly_budget column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS monthly_budget DECIMAL(10,2) DEFAULT 0.00 AFTER full_name;

-- Update existing users to have a default monthly budget
UPDATE users SET monthly_budget = 1000.00 WHERE monthly_budget = 0.00 OR monthly_budget IS NULL;

-- Note: We're keeping the old columns for now to avoid data loss
-- In production, you might want to drop them after ensuring data migration is complete:
-- ALTER TABLE users DROP COLUMN username;
-- ALTER TABLE users DROP COLUMN employee_id; 
-- ALTER TABLE users DROP COLUMN department;
-- ALTER TABLE users DROP COLUMN role;
-- ALTER TABLE users DROP COLUMN last_login;

SELECT 'Migration completed successfully' as status;
