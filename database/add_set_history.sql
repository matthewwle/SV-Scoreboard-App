-- Add set_history column to score_states table
ALTER TABLE score_states 
ADD COLUMN IF NOT EXISTS set_history TEXT DEFAULT '[]';

-- Update existing records to have empty array
UPDATE score_states 
SET set_history = '[]' 
WHERE set_history IS NULL;
