-- Migration: Multi-Tournament Support
-- This migration transforms the system from single-tournament to multi-tournament architecture
-- WARNING: This will delete all existing courts, matches, and related data (fresh start)

-- Step 1: Delete all existing data (matches, score_states, match_logs) before dropping courts
-- This is necessary because matches reference courts via foreign key
DELETE FROM match_logs;
DELETE FROM score_states;
DELETE FROM matches;

-- Step 2: Drop existing foreign key constraints that reference courts (if tables exist)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_court_id_fkey;
ALTER TABLE match_logs DROP CONSTRAINT IF EXISTS match_logs_court_id_fkey;

-- Step 3: Clear current_match_id references in courts before dropping (if courts table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'courts') THEN
    UPDATE courts SET current_match_id = NULL;
    ALTER TABLE courts DROP CONSTRAINT IF EXISTS fk_current_match;
  END IF;
END $$;

-- Step 4: Drop existing courts table (all data will be lost - fresh start)
DROP TABLE IF EXISTS courts CASCADE;

-- Step 3: Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  sportwrench_event_id VARCHAR(5),  -- 5-digit, nullable
  court_count INTEGER NOT NULL,     -- Number of courts (1-20, etc.)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for active tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_is_active ON tournaments(is_active);
CREATE INDEX IF NOT EXISTS idx_tournaments_sportwrench_event_id ON tournaments(sportwrench_event_id);

-- Step 4: Create new courts table (tournament-scoped)
CREATE TABLE courts (
  id SERIAL PRIMARY KEY,
  tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  court_number INTEGER NOT NULL,  -- 1 to N within tournament
  name VARCHAR(50) NOT NULL,     -- e.g., "Court 1"
  current_match_id INTEGER,
  larix_device_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tournament_id, court_number)
);

-- Add indexes for courts
CREATE INDEX IF NOT EXISTS idx_courts_tournament_id ON courts(tournament_id);
CREATE INDEX IF NOT EXISTS idx_courts_tournament_court_number ON courts(tournament_id, court_number);
CREATE INDEX IF NOT EXISTS idx_courts_current_match_id ON courts(current_match_id);

-- Step 5: Add tournament_id to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE;

-- Add index for tournament_id in matches
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);

-- Recreate foreign key for matches.court_id (now references new courts table)
ALTER TABLE matches
  ADD CONSTRAINT matches_court_id_fkey
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE;

-- Step 6: Add tournament_id to match_logs table
ALTER TABLE match_logs ADD COLUMN IF NOT EXISTS tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE;

-- Add index for tournament_id in match_logs
CREATE INDEX IF NOT EXISTS idx_match_logs_tournament_id ON match_logs(tournament_id);

-- Recreate foreign key for match_logs.court_id
ALTER TABLE match_logs
  ADD CONSTRAINT match_logs_court_id_fkey
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE;

-- Recreate foreign key for courts.current_match_id
ALTER TABLE courts
  ADD CONSTRAINT fk_current_match
  FOREIGN KEY (current_match_id) REFERENCES matches(id) ON DELETE SET NULL;

-- Comments for documentation
COMMENT ON TABLE tournaments IS 'Tournaments - each has its own set of courts numbered 1 to N';
COMMENT ON COLUMN tournaments.court_count IS 'Number of courts for this tournament (Courts 1 to N)';
COMMENT ON COLUMN courts.tournament_id IS 'Tournament this court belongs to';
COMMENT ON COLUMN courts.court_number IS 'Court number within tournament (1 to N)';
COMMENT ON COLUMN matches.tournament_id IS 'Tournament this match belongs to';
COMMENT ON COLUMN match_logs.tournament_id IS 'Tournament this match log belongs to';
