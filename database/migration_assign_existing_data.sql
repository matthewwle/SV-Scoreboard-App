-- Migration: Assign Existing Data to Default Tournament
-- Run this AFTER migration_add_tournaments.sql if you have existing data

-- 1. Create a default tournament for existing data
DO $$
DECLARE
  default_tournament_id INTEGER;
  existing_courts_count INTEGER;
  existing_matches_count INTEGER;
  existing_logs_count INTEGER;
BEGIN
  -- Check if there's existing data without tournament_id
  SELECT COUNT(*) INTO existing_courts_count FROM courts WHERE tournament_id IS NULL;
  SELECT COUNT(*) INTO existing_matches_count FROM matches WHERE tournament_id IS NULL;
  SELECT COUNT(*) INTO existing_logs_count FROM match_logs WHERE tournament_id IS NULL;
  
  -- Only create default tournament if there's existing data
  IF existing_courts_count > 0 OR existing_matches_count > 0 OR existing_logs_count > 0 THEN
    -- Create default tournament
    INSERT INTO tournaments (name) 
    VALUES ('Default Tournament')
    ON CONFLICT DO NOTHING
    RETURNING id INTO default_tournament_id;
    
    -- If tournament already exists, get its ID
    IF default_tournament_id IS NULL THEN
      SELECT id INTO default_tournament_id FROM tournaments WHERE name = 'Default Tournament' LIMIT 1;
    END IF;
    
    -- Assign existing courts to default tournament
    IF existing_courts_count > 0 THEN
      UPDATE courts 
      SET tournament_id = default_tournament_id 
      WHERE tournament_id IS NULL;
      RAISE NOTICE 'Assigned % courts to Default Tournament', existing_courts_count;
    END IF;
    
    -- Assign existing matches to default tournament
    IF existing_matches_count > 0 THEN
      UPDATE matches 
      SET tournament_id = default_tournament_id 
      WHERE tournament_id IS NULL;
      RAISE NOTICE 'Assigned % matches to Default Tournament', existing_matches_count;
    END IF;
    
    -- Assign existing match_logs to default tournament
    IF existing_logs_count > 0 THEN
      UPDATE match_logs 
      SET tournament_id = default_tournament_id 
      WHERE tournament_id IS NULL;
      RAISE NOTICE 'Assigned % match logs to Default Tournament', existing_logs_count;
    END IF;
    
    RAISE NOTICE 'Migration complete: All existing data assigned to Default Tournament (ID: %)', default_tournament_id;
  ELSE
    RAISE NOTICE 'No existing data found - migration skipped';
  END IF;
END $$;

