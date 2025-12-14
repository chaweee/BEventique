CREATE TABLE payment (
  Payment_ID INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  Amount DECIMAL(10,2) NOT NULL,
  Date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Method VARCHAR(50) DEFAULT 'cash',
  Status VARCHAR(20) DEFAULT 'completed',
  -- Optional: add a reference to the admin or user who processed the payment
  -- processed_by INT,
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
