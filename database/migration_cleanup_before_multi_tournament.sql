-- Cleanup script: Run this if migration_multi_tournament.sql failed partway through
-- This will clean up any partial state so you can re-run the migration

-- Delete all data
DELETE FROM match_logs;
DELETE FROM score_states;
DELETE FROM matches;

-- Clear court references
UPDATE courts SET current_match_id = NULL WHERE current_match_id IS NOT NULL;

-- Drop foreign key constraints if they exist
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_court_id_fkey;
ALTER TABLE match_logs DROP CONSTRAINT IF EXISTS match_logs_court_id_fkey;
ALTER TABLE courts DROP CONSTRAINT IF EXISTS fk_current_match;

-- Drop tournament_id columns if they were partially added
ALTER TABLE matches DROP COLUMN IF EXISTS tournament_id;
ALTER TABLE match_logs DROP COLUMN IF EXISTS tournament_id;

-- Drop tournaments table if it was partially created
DROP TABLE IF EXISTS tournaments CASCADE;

-- Drop new courts table if it was partially created
DROP TABLE IF EXISTS courts CASCADE;

-- Now you can re-run migration_multi_tournament.sql
