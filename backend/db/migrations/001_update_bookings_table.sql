-- Migration: Update bookings table schema
-- Description: Remove has_custom_layout column and modify custom_layout to LONGTEXT
-- Date: 2025-12-07

-- Drop the has_custom_layout column if it exists
ALTER TABLE bookings DROP COLUMN IF EXISTS has_custom_layout;

-- Modify custom_layout to LONGTEXT
ALTER TABLE bookings MODIFY COLUMN custom_layout LONGTEXT NULL;

-- Add comment to clarify the column stores JSON canvas data
ALTER TABLE bookings CHANGE COLUMN custom_layout custom_layout LONGTEXT NULL COMMENT 'Stores JSON-serialized Fabric.js canvas objects for custom layout';

-- Verify the schema
-- DESC bookings;
