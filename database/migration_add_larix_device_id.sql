-- Migration: Add Larix Device ID to Courts
-- Allows each court to specify which Larix device to control

-- Add device_id column to courts table
ALTER TABLE courts
ADD COLUMN IF NOT EXISTS larix_device_id VARCHAR(100);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_courts_larix_device_id ON courts(larix_device_id);

-- Add comment for documentation
COMMENT ON COLUMN courts.larix_device_id IS 'Unique identifier for the Larix device assigned to this court (e.g., device_1, device_2, or MAC address)';

-- Optional: Pre-populate device IDs if you want them to match court numbers
-- UPDATE courts SET larix_device_id = 'device_' || id WHERE id BETWEEN 1 AND 70;
-- Or use sequential names: court1, court2, etc.
-- UPDATE courts SET larix_device_id = 'court' || id WHERE id BETWEEN 1 AND 70;

