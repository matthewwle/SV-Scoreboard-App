-- Migration: Add Multi-Tournament Support
-- This migration adds tournament isolation to the database

-- 1. Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add tournament_id to courts table
ALTER TABLE courts
  ADD COLUMN IF NOT EXISTS tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE;

-- 3. Add tournament_id to matches table
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE;

-- 4. Add tournament_id to match_logs table
ALTER TABLE match_logs
  ADD COLUMN IF NOT EXISTS tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courts_tournament_id ON courts(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_tournament_id ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_match_logs_tournament_id ON match_logs(tournament_id);

-- 6. Create a default tournament for existing data (optional)
-- If you have existing data, you may want to create a default tournament and assign it
-- INSERT INTO tournaments (name) VALUES ('Default Tournament');
-- UPDATE courts SET tournament_id = (SELECT id FROM tournaments WHERE name = 'Default Tournament' LIMIT 1);
-- UPDATE matches SET tournament_id = (SELECT id FROM tournaments WHERE name = 'Default Tournament' LIMIT 1);
-- UPDATE match_logs SET tournament_id = (SELECT id FROM tournaments WHERE name = 'Default Tournament' LIMIT 1);

-- 7. Update the auto-update trigger for tournaments
CREATE OR REPLACE FUNCTION update_tournaments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tournaments_updated_at 
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_tournaments_updated_at();

