-- Petty Cash Management System Database Schema

CREATE DATABASE IF NOT EXISTS petty_cash_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE petty_cash_db;

-- Users table (both admin and clients)
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    department VARCHAR(50) NOT NULL,
    role ENUM('admin', 'client') DEFAULT 'client',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_employee_id (employee_id),
    INDEX idx_department (department),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Categories table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#2196F3', -- HEX color code
    budget_limit DECIMAL(10,2) NULL, -- monthly budget limit
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_active (is_active),
    INDEX idx_budget_limit (budget_limit)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Transactions table
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL,
    store_name VARCHAR(100) NULL,
    receipt_path VARCHAR(500) NULL, -- path to receipt file
    ocr_data JSON NULL, -- OCR data in JSON format
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_notes TEXT NULL, -- admin notes
    approved_by INT NULL, -- approved by user
    approved_at TIMESTAMP NULL, -- approved at timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_category_id (category_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_status (status),
    INDEX idx_amount (amount),
    INDEX idx_approved_by (approved_by),
    INDEX idx_created_at (created_at),
    INDEX idx_user_status (user_id, status),
    INDEX idx_date_status (transaction_date, status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Cash fund table
CREATE TABLE cash_fund (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fund_name VARCHAR(100) NOT NULL,
    current_balance DECIMAL(10,2) NOT NULL DEFAULT 0,
    initial_balance DECIMAL(10,2) NOT NULL,
    last_withdrawal_date DATE NULL,
    last_withdrawal_amount DECIMAL(10,2) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_fund_name (fund_name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Cash movements table
CREATE TABLE cash_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fund_id INT NOT NULL,
    movement_type ENUM('deposit', 'withdrawal', 'reimbursement') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT NOT NULL,
    reference_transaction_id INT NULL, -- reference to transaction
    performed_by INT NOT NULL,
    movement_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (fund_id) REFERENCES cash_fund(id) ON DELETE CASCADE,
    FOREIGN KEY (reference_transaction_id) REFERENCES transactions(id) ON DELETE SET NULL,
    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_fund_id (fund_id),
    INDEX idx_movement_type (movement_type),
    INDEX idx_movement_date (movement_date),
    INDEX idx_performed_by (performed_by),
    INDEX idx_reference_transaction (reference_transaction_id)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- System settings table
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Activity log table
CREATE TABLE activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- users, transactions, categories, etc.
    entity_id INT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_entity_type (entity_type),
    INDEX idx_entity_id (entity_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default admin user (password: admin123)
INSERT INTO users (username, email, password_hash, full_name, employee_id, department, role) VALUES 
('admin', 'admin@company.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxq5S/kS', 'System Administrator', 'EMP001', 'Management', 'admin');

-- Insert default categories
INSERT INTO categories (name, description, color, budget_limit) VALUES 
('Food and Beverages', 'Meals, snacks, and drinks for employees', '#FF9800', 1000.00),
('Transportation', 'Work-related travel, fuel, and parking', '#2196F3', 800.00),
('Office Supplies', 'Writing instruments, paper, and office equipment', '#4CAF50', 500.00),
('Client Entertainment', 'Business meetings and client entertainment', '#9C27B0', 1500.00),
('Training and Conferences', 'Professional development and conferences', '#FF5722', 2000.00),
('Health and Wellness', 'Hygiene products and wellness initiatives', '#00BCD4', 300.00),
('Communication', 'Phone, internet, and postal services', '#795548', 400.00),
('Miscellaneous', 'Other business expenses not categorized elsewhere', '#607D8B', 500.00);

-- Insert default cash fund
INSERT INTO cash_fund (fund_name, current_balance, initial_balance) VALUES 
('Main Fund', 10000.00, 10000.00);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES 
('max_transaction_amount', '1000', 'number', 'Maximum amount for a single transaction'),
('require_receipt_above', '50', 'number', 'Amount above which receipts are required'),
('auto_approve_below', '100', 'number', 'Amount below which transactions are auto-approved'),
('monthly_budget_limit', '20000', 'number', 'Monthly budget limit for all categories'),
('ocr_confidence_threshold', '0.8', 'number', 'Minimum OCR confidence threshold'),
('email_notifications', 'true', 'boolean', 'Send email notifications'),
('backup_frequency_days', '7', 'number', 'Backup frequency in days'),
('session_timeout_minutes', '60', 'number', 'Session timeout in minutes');

-- Create views for easier data access

-- View for transactions with user and category details
CREATE VIEW transactions_detailed AS
SELECT 
    t.id,
    t.amount,
    t.description,
    t.transaction_date,
    t.store_name,
    t.status,
    t.admin_notes,
    t.created_at,
    t.updated_at,
    u.username,
    u.full_name as user_name,
    u.department,
    u.employee_id,
    c.name as category_name,
    c.color as category_color,
    c.budget_limit as category_budget,
    approver.full_name as approved_by_name,
    t.approved_at
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN users approver ON t.approved_by = approver.id;

-- View for monthly category statistics
CREATE VIEW monthly_category_stats AS
SELECT 
    c.id as category_id,
    c.name as category_name,
    c.budget_limit,
    YEAR(t.transaction_date) as year,
    MONTH(t.transaction_date) as month,
    COUNT(t.id) as transaction_count,
    SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END) as approved_amount,
    SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END) as pending_amount,
    SUM(CASE WHEN t.status = 'rejected' THEN t.amount ELSE 0 END) as rejected_amount,
    ROUND((SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END) / c.budget_limit) * 100, 2) as budget_utilization
FROM categories c
LEFT JOIN transactions t ON c.id = t.category_id
WHERE c.is_active = TRUE
GROUP BY c.id, YEAR(t.transaction_date), MONTH(t.transaction_date);

-- View for user statistics
CREATE VIEW user_statistics AS
SELECT 
    u.id as user_id,
    u.username,
    u.full_name,
    u.department,
    u.employee_id,
    COUNT(t.id) as total_transactions,
    SUM(CASE WHEN t.status = 'approved' THEN t.amount ELSE 0 END) as total_approved,
    SUM(CASE WHEN t.status = 'pending' THEN t.amount ELSE 0 END) as total_pending,
    SUM(CASE WHEN t.status = 'rejected' THEN t.amount ELSE 0 END) as total_rejected,
    AVG(CASE WHEN t.status = 'approved' THEN t.amount ELSE NULL END) as avg_transaction,
    MAX(t.transaction_date) as last_transaction_date,
    COUNT(CASE WHEN t.status = 'approved' AND t.transaction_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as transactions_last_30_days
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id
WHERE u.role = 'client' AND u.is_active = TRUE
GROUP BY u.id;

-- Create triggers for automatic updates

-- Trigger to update cash fund balance when a transaction is approved
DELIMITER //
CREATE TRIGGER update_cash_fund_on_approval
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE cash_fund 
        SET current_balance = current_balance - NEW.amount,
            updated_at = CURRENT_TIMESTAMP
        WHERE is_active = TRUE 
        LIMIT 1;
        
        INSERT INTO cash_movements (fund_id, movement_type, amount, description, reference_transaction_id, performed_by, movement_date)
        SELECT 
            cf.id,
            'reimbursement',
            NEW.amount,
            CONCAT('Reimbursement for transaction #', NEW.id, ' - ', NEW.description),
            NEW.id,
            NEW.approved_by,
            CURDATE()
        FROM cash_fund cf 
        WHERE cf.is_active = TRUE 
        LIMIT 1;
    END IF;
END//

-- Trigger to log transaction changes
CREATE TRIGGER log_transaction_changes
AFTER UPDATE ON transactions
FOR EACH ROW
BEGIN
    INSERT INTO activity_log (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (
        NEW.approved_by,
        'transaction_status_changed',
        'transactions',
        NEW.id,
        JSON_OBJECT('status', OLD.status, 'admin_notes', OLD.admin_notes),
        JSON_OBJECT('status', NEW.status, 'admin_notes', NEW.admin_notes)
    );
END//

-- Trigger to update user timestamp
CREATE TRIGGER update_user_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

CREATE TRIGGER update_category_timestamp
BEFORE UPDATE ON categories
FOR EACH ROW
BEGIN
    SET NEW.updated_at = CURRENT_TIMESTAMP;
END//

DELIMITER ;

-- Create additional indexes for better performance
CREATE INDEX idx_transactions_date_status_user ON transactions(transaction_date, status, user_id);
CREATE INDEX idx_transactions_category_date ON transactions(category_id, transaction_date);
CREATE INDEX idx_cash_movements_date_type ON cash_movements(movement_date, movement_type);
CREATE INDEX idx_activity_log_date_user ON activity_log(created_at, user_id);

-- Add additional constraints
ALTER TABLE transactions ADD CONSTRAINT chk_amount_positive CHECK (amount > 0);
ALTER TABLE cash_fund ADD CONSTRAINT chk_balance_non_negative CHECK (current_balance >= 0);
ALTER TABLE cash_movements ADD CONSTRAINT chk_movement_amount_positive CHECK (amount > 0);

-- Set up user permissions (for production environment)
-- CREATE USER 'petty_cash_app'@'localhost' IDENTIFIED BY 'secure_password_here';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON petty_cash_system.* TO 'petty_cash_app'@'localhost';
-- FLUSH PRIVILEGES;

-- Success message
SELECT 'Database schema created successfully!' as message;
