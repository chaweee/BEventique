-- ============================================================
-- DESIGN MANAGEMENT SYSTEM - Database Schema
-- ============================================================

-- Design Requests Table
CREATE TABLE IF NOT EXISTS design_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    client_id INT NOT NULL,
    assigned_to INT DEFAULT NULL,
    layout_specs TEXT,
    notes TEXT,
    final_output VARCHAR(500) DEFAULT NULL,
    status ENUM('pending', 'assigned', 'in_progress', 'revision', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (client_id) REFERENCES account(Account_ID) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES account(Account_ID) ON DELETE SET NULL,
    
    INDEX idx_status (status),
    INDEX idx_client (client_id),
    INDEX idx_designer (assigned_to),
    INDEX idx_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Design Revisions Table
CREATE TABLE IF NOT EXISTS design_revisions (
    revision_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    revision_note TEXT NOT NULL,
    revised_by INT NOT NULL,
    revision_file VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (request_id) REFERENCES design_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (revised_by) REFERENCES account(Account_ID) ON DELETE CASCADE,
    
    INDEX idx_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Design History/Activity Log Table (Optional - for tracking)
CREATE TABLE IF NOT EXISTS design_activity_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    performed_by INT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (request_id) REFERENCES design_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES account(Account_ID) ON DELETE CASCADE,
    
    INDEX idx_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================
-- CRUD QUERIES
-- ============================================================

-- A. Create a design request
-- INSERT INTO design_requests (booking_id, client_id, layout_specs, notes, status)
-- VALUES (?, ?, ?, ?, 'pending');

-- B. Get all pending design requests
-- SELECT dr.*, 
--        a.Firstname AS client_firstname, a.Lastname AS client_lastname, a.Email AS client_email
-- FROM design_requests dr
-- LEFT JOIN account a ON dr.client_id = a.Account_ID
-- WHERE dr.status = 'pending'
-- ORDER BY dr.created_at ASC;

-- C. Assign a designer to a request
-- UPDATE design_requests 
-- SET assigned_to = ?, status = 'assigned', updated_at = NOW()
-- WHERE request_id = ?;

-- D. Save revision notes from client
-- INSERT INTO design_revisions (request_id, revision_note, revised_by)
-- VALUES (?, ?, ?);
-- 
-- UPDATE design_requests SET status = 'revision', updated_at = NOW() WHERE request_id = ?;

-- E. Save updated design output from designer
-- UPDATE design_requests 
-- SET final_output = ?, status = 'completed', completed_at = NOW(), updated_at = NOW()
-- WHERE request_id = ?;

-- F. Get complete design request details with joins
-- SELECT 
--     dr.*,
--     client.Firstname AS client_firstname, 
--     client.Lastname AS client_lastname,
--     client.Email AS client_email,
--     designer.Firstname AS designer_firstname,
--     designer.Lastname AS designer_lastname,
--     designer.Email AS designer_email
-- FROM design_requests dr
-- LEFT JOIN account client ON dr.client_id = client.Account_ID
-- LEFT JOIN account designer ON dr.assigned_to = designer.Account_ID
-- WHERE dr.request_id = ?;

-- Get revisions for a request
-- SELECT rev.*, a.Firstname, a.Lastname
-- FROM design_revisions rev
-- LEFT JOIN account a ON rev.revised_by = a.Account_ID
-- WHERE rev.request_id = ?
-- ORDER BY rev.created_at DESC;
