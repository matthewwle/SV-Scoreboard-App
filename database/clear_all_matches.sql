-- Clear All Matches from Database
-- Run this in Supabase SQL Editor to delete all matches

-- First, clear any current match assignments from courts
UPDATE courts SET current_match_id = NULL;

-- Delete all score states (they reference matches)
DELETE FROM score_states;

-- Delete all match logs
DELETE FROM match_logs;

-- Delete all matches
DELETE FROM matches;

-- Verify deletion
SELECT 'Matches remaining:' as status, COUNT(*) as count FROM matches;

