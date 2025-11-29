-- Create package_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS package_photos (
    Photo_ID INT AUTO_INCREMENT PRIMARY KEY,
    Package_ID INT NOT NULL,
    Photo VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Package_ID) REFERENCES package(Package_ID) ON DELETE CASCADE,
    INDEX idx_package_id (Package_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Verify the structure
DESCRIBE package_photos;

-- Check existing data
SELECT * FROM package_photos ORDER BY Photo_ID DESC LIMIT 10;
