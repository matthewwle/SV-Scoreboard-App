-- Migration: Remove Multi-Tournament Support
-- This migration removes all tournament-related database changes
-- WARNING: This will delete all tournament data and columns

-- 1. Drop indexes related to tournaments
DROP INDEX IF EXISTS idx_courts_tournament_id;
DROP INDEX IF EXISTS idx_matches_tournament_id;
DROP INDEX IF EXISTS idx_match_logs_tournament_id;

-- 2. Remove tournament_id foreign key constraints and columns
ALTER TABLE courts
  DROP CONSTRAINT IF EXISTS courts_tournament_id_fkey,
  DROP COLUMN IF EXISTS tournament_id;

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_tournament_id_fkey,
  DROP COLUMN IF EXISTS tournament_id;

ALTER TABLE match_logs
  DROP CONSTRAINT IF EXISTS match_logs_tournament_id_fkey,
  DROP COLUMN IF EXISTS tournament_id;

-- 3. Drop tournament settings columns (if they exist)
ALTER TABLE tournaments
  DROP COLUMN IF EXISTS label,
  DROP COLUMN IF EXISTS sportwrench_event_id;

-- 4. Drop the trigger function for tournaments
DROP TRIGGER IF EXISTS update_tournaments_updated_at ON tournaments;
DROP FUNCTION IF EXISTS update_tournaments_updated_at();

-- 5. Drop the tournaments table (this will cascade delete all tournament data)
-- WARNING: This permanently deletes all tournament records
DROP TABLE IF EXISTS tournaments CASCADE;

-- 6. Verify cleanup (optional - run these to check)
-- SELECT COUNT(*) FROM tournaments; -- Should return error (table doesn't exist)
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'courts' AND column_name = 'tournament_id'; -- Should return 0 rows
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'matches' AND column_name = 'tournament_id'; -- Should return 0 rows
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'match_logs' AND column_name = 'tournament_id'; -- Should return 0 rows

