-- Volleyball Scoreboard Database Schema
-- For Supabase/PostgreSQL

-- Enable UUID extension (optional, but useful)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Courts Table
CREATE TABLE IF NOT EXISTS courts (
  id INTEGER PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  current_match_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  court_id INTEGER NOT NULL,
  team_a VARCHAR(100) NOT NULL,
  team_b VARCHAR(100) NOT NULL,
  sets_a INTEGER DEFAULT 0,
  sets_b INTEGER DEFAULT 0,
  start_time VARCHAR(50) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE
);

-- Score States Table
CREATE TABLE IF NOT EXISTS score_states (
  id SERIAL PRIMARY KEY,
  match_id INTEGER UNIQUE NOT NULL,
  set_number INTEGER DEFAULT 1,
  team_a_score INTEGER DEFAULT 0,
  team_b_score INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

-- Add foreign key constraint for courts.current_match_id
ALTER TABLE courts
  ADD CONSTRAINT fk_current_match
  FOREIGN KEY (current_match_id) REFERENCES matches(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX idx_matches_court_id ON matches(court_id);
CREATE INDEX idx_matches_is_completed ON matches(is_completed);
CREATE INDEX idx_score_states_match_id ON score_states(match_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_score_states_updated_at 
  BEFORE UPDATE ON score_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Initialize 120 courts
INSERT INTO courts (id, name)
SELECT 
  generate_series AS id,
  'Court ' || generate_series AS name
FROM generate_series(1, 120)
ON CONFLICT (id) DO NOTHING;

-- Sample data (optional - for testing)
-- INSERT INTO matches (court_id, team_a, team_b, start_time) VALUES
--   (1, 'Spikers United', 'Net Warriors', '09:00'),
--   (2, 'Block Party', 'Set Point', '09:00'),
--   (3, 'Court Jesters', 'Dig Deep', '09:15');

