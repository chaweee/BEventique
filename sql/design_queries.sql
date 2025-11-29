-- ============================================================
-- DESIGN QUERIES SYSTEM - Conversation/Support Ticket System
-- ============================================================

-- Design Query Threads (Conversation Threads)
CREATE TABLE IF NOT EXISTS design_query_threads (
    thread_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    booking_id INT NULL,
    subject VARCHAR(255) NOT NULL,
    status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assigned_to INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES account(Account_ID) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES account(Account_ID) ON DELETE SET NULL,
    
    INDEX idx_customer (customer_id),
    INDEX idx_status (status),
    INDEX idx_assigned (assigned_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Design Query Messages (Individual Messages in Conversation)
CREATE TABLE IF NOT EXISTS design_query_messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    thread_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    is_designer BOOLEAN DEFAULT FALSE,
    read_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (thread_id) REFERENCES design_query_threads(thread_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES account(Account_ID) ON DELETE CASCADE,
    
    INDEX idx_thread (thread_id),
    INDEX idx_sender (sender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Sample threads
-- INSERT INTO design_query_threads (customer_id, booking_id, subject, status, priority)
-- VALUES 
-- (1, 101, 'Need to reschedule my booking', 'open', 'high'),
-- (2, 102, 'Questions about table arrangements', 'in_progress', 'medium'),
-- (1, NULL, 'Can I add more chairs to my package?', 'resolved', 'low');

-- Sample messages
-- INSERT INTO design_query_messages (thread_id, sender_id, message, is_designer)
-- VALUES 
-- (1, 1, 'Hi, I need to reschedule my booking from March 15 to March 20. Is that possible?', FALSE),
-- (1, 3, 'Hello! Let me check the availability for March 20. I will get back to you shortly.', TRUE),
-- (2, 2, 'I want the tables arranged in a U-shape formation. Can you help with that?', FALSE);
