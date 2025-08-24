-- Special Expense Requests Table
-- This table handles special expense requests that require admin approval

CREATE TABLE IF NOT EXISTS special_expense_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    purpose TEXT NOT NULL,
    justification TEXT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_id INT NULL,
    admin_notes TEXT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_admin_id (admin_id),
    INDEX idx_created_at (created_at),
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- View for special requests with user details
CREATE VIEW special_requests_detailed AS
SELECT 
    sr.id,
    sr.amount,
    sr.purpose,
    sr.justification,
    sr.status,
    sr.admin_notes,
    sr.approved_at,
    sr.created_at,
    sr.updated_at,
    u.full_name,
    u.email as user_email,
    admin.full_name as admin_name
FROM special_expense_requests sr
JOIN users u ON sr.user_id = u.id
LEFT JOIN users admin ON sr.admin_id = admin.id;
