-- Migration: Add is_crossover column to matches table
-- Crossover matches are only 1 set instead of best of 3

ALTER TABLE matches ADD COLUMN IF NOT EXISTS is_crossover BOOLEAN DEFAULT FALSE;

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_matches_is_crossover ON matches(is_crossover);

COMMENT ON COLUMN matches.is_crossover IS 'Crossover match = 1 set only (Y in CSV). Regular match = best of 3 (N or empty in CSV).';

