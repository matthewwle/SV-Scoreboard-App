-- Migration: Add Tournament-Specific Settings
-- Adds columns to tournaments table for label and SportWrench Event ID

-- Add tournament label column
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS label VARCHAR(100) DEFAULT 'Winter Formal';

-- Add SportWrench Event ID column
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS sportwrench_event_id VARCHAR(10);

-- Update existing tournaments with default label if null
UPDATE tournaments
SET label = 'Winter Formal'
WHERE label IS NULL;

