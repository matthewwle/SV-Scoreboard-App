-- Migration: Add external_match_id to matches table
-- This stores the MatchID from the uploaded spreadsheet

ALTER TABLE matches ADD COLUMN IF NOT EXISTS external_match_id VARCHAR(100);

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_matches_external_match_id ON matches(external_match_id);

COMMENT ON COLUMN matches.external_match_id IS 'The MatchID from the uploaded spreadsheet (e.g., "1", "42", etc.)';

