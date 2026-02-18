-- Migration: Simplified Scoreboard
-- Removes matches, match_logs, score_states. Adds court_score_states (one row per court).
-- Drops SportWrench and Larix columns from tournaments/courts.

-- Step 1: Delete all data in dependent tables
DELETE FROM match_logs;
DELETE FROM score_states;
DELETE FROM matches;

-- Step 2: Drop foreign key constraints that reference matches/courts
ALTER TABLE courts DROP CONSTRAINT IF EXISTS fk_current_match;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_court_id_fkey;
ALTER TABLE match_logs DROP CONSTRAINT IF EXISTS match_logs_court_id_fkey;
ALTER TABLE match_logs DROP CONSTRAINT IF EXISTS match_logs_match_id_fkey;

-- Step 3: Drop old tables
DROP TABLE IF EXISTS match_logs;
DROP TABLE IF EXISTS score_states;
DROP TABLE IF EXISTS matches;

-- Step 4: Alter courts - remove current_match_id and larix_device_id
ALTER TABLE courts DROP COLUMN IF EXISTS current_match_id;
ALTER TABLE courts DROP COLUMN IF EXISTS larix_device_id;

-- Step 5: Alter tournaments - remove sportwrench_event_id
ALTER TABLE tournaments DROP COLUMN IF EXISTS sportwrench_event_id;
DROP INDEX IF EXISTS idx_tournaments_sportwrench_event_id;

-- Step 6: Create court_score_states (one row per court)
CREATE TABLE court_score_states (
  court_id INTEGER PRIMARY KEY REFERENCES courts(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL DEFAULT 1,
  left_score INTEGER NOT NULL DEFAULT 0,
  right_score INTEGER NOT NULL DEFAULT 0,
  sets_left INTEGER NOT NULL DEFAULT 0,
  sets_right INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_court_score_states_court_id ON court_score_states(court_id);
COMMENT ON TABLE court_score_states IS 'Current score state per court (Left/Right, 3 sets standard)';
