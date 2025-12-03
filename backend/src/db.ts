import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Court, Match, ScoreState, MatchLog } from './types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_KEY must be set in backend/.env file');
  console.error('Current SUPABASE_URL:', supabaseUrl);
  process.exit(1);
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Court operations
export async function getCourt(id: number): Promise<Court | null> {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching court:', error);
    return null;
  }
  return data;
}

export async function getAllCourts(): Promise<Court[]> {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .order('id');
  
  if (error) {
    console.error('Error fetching courts:', error);
    return [];
  }
  return data || [];
}

// Match operations
export async function getMatch(id: number): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching match:', error);
    return null;
  }
  return data;
}

export async function getCurrentMatch(courtId: number): Promise<Match | null> {
  const court = await getCourt(courtId);
  if (!court || !court.current_match_id) return null;
  
  return getMatch(court.current_match_id);
}

export async function createMatch(match: Omit<Match, 'id' | 'created_at'>): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .insert(match)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating match:', error);
    return null;
  }
  return data;
}

export async function updateMatch(id: number, updates: Partial<Match>): Promise<Match | null> {
  const { data, error } = await supabase
    .from('matches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating match:', error);
    return null;
  }
  return data;
}

// Score state operations
export async function getScoreState(matchId: number): Promise<ScoreState | null> {
  const { data, error } = await supabase
    .from('score_states')
    .select('*')
    .eq('match_id', matchId)
    .single();
  
  if (error) {
    console.error('Error fetching score state:', error);
    return null;
  }
  return data;
}

// Initialize a fresh score state for a new match
export async function initializeScoreState(matchId: number): Promise<ScoreState | null> {
  const scoreState: Omit<ScoreState, 'id' | 'updated_at'> = {
    match_id: matchId,
    set_number: 1,
    team_a_score: 0,
    team_b_score: 0
  };
  return upsertScoreState(scoreState);
}

export async function upsertScoreState(scoreState: Omit<ScoreState, 'id' | 'updated_at'>): Promise<ScoreState | null> {
  // Remove set_history from the object before upserting (optional column that may not exist)
  const { set_history, ...scoreStateWithoutHistory } = scoreState as any;
  
  const { data, error } = await supabase
    .from('score_states')
    .upsert(scoreStateWithoutHistory, { onConflict: 'match_id' })
    .select()
    .single();
  
  if (error) {
    console.error('Error upserting score state:', error);
    return null;
  }
  return data;
}

export async function updateCourtMatch(courtId: number, matchId: number | null): Promise<Court | null> {
  const { data, error } = await supabase
    .from('courts')
    .update({ current_match_id: matchId })
    .eq('id', courtId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating court match:', error);
    return null;
  }
  return data;
}

// Update court's Larix device ID
export async function updateCourtLarixDeviceId(
  courtId: number, 
  deviceId: string | null
): Promise<Court | null> {
  const { data, error } = await supabase
    .from('courts')
    .update({ larix_device_id: deviceId })
    .eq('id', courtId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating court Larix device ID:', error);
    return null;
  }
  return data;
}

// Delete all matches for a court
export async function deleteMatchesForCourt(courtId: number): Promise<void> {
  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('court_id', courtId);
  
  if (error) {
    console.error('Error deleting matches for court:', error);
  }
}

// Get upcoming matches for a court (not completed, ordered by id ascending - first uploaded = first to play)
export async function getUpcomingMatches(courtId: number, limit: number = 5): Promise<Match[]> {
  const { data, error} = await supabase
    .from('matches')
    .select('*')
    .eq('court_id', courtId)
    .eq('is_completed', false)
    .order('id', { ascending: true })  // Ascending: first match uploaded = first to play
    .limit(limit);
  
  if (error) {
    console.error('Error fetching upcoming matches:', error);
    return [];
  }
  
  return data || [];
}

// Get the next available match for a court (first uncompleted match)
export async function getNextMatch(courtId: number): Promise<Match | null> {
  const matches = await getUpcomingMatches(courtId, 1);
  return matches.length > 0 ? matches[0] : null;
}

// Initialize courts (run on startup)
export async function initializeCourts(count: number = 70): Promise<void> {
  const courts = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Court ${i + 1}`,
    current_match_id: null
  }));

  const { error } = await supabase
    .from('courts')
    .upsert(courts, { onConflict: 'id' });

  if (error) {
    console.error('Error initializing courts:', error);
  } else {
    console.log(`Initialized ${count} courts`);
  }
}

// Match Log operations
export async function createMatchLog(courtId: number, matchId: number, teamA: string, teamB: string): Promise<MatchLog | null> {
  const matchLog: Omit<MatchLog, 'id' | 'created_at'> = {
    court_id: courtId,
    match_id: matchId,
    team_a: teamA,
    team_b: teamB,
    start_time: new Date().toISOString(),
    end_time: null
  };
  
  const { data, error } = await supabase
    .from('match_logs')
    .insert(matchLog)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating match log:', error);
    return null;
  }
  
  console.log(`✅ Match log created for Court ${courtId}: ${teamA} vs ${teamB}`);
  return data;
}

export async function updateMatchLogEndTime(matchId: number): Promise<MatchLog | null> {
  const { data, error } = await supabase
    .from('match_logs')
    .update({ end_time: new Date().toISOString() })
    .eq('match_id', matchId)
    .is('end_time', null)  // Only update logs that haven't ended yet
    .select()
    .single();
  
  if (error) {
    console.error('Error updating match log end time:', error);
    return null;
  }
  
  console.log(`✅ Match log ended for match ${matchId}`);
  return data;
}

export async function getAllMatchLogs(): Promise<MatchLog[]> {
  const { data, error } = await supabase
    .from('match_logs')
    .select('*')
    .order('start_time', { ascending: true });
  
  if (error) {
    console.error('Error fetching match logs:', error);
    return [];
  }
  
  return data || [];
}

