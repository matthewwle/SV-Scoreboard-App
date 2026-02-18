import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Tournament, Court, CourtScoreState } from './types';
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

// Tournament operations
export async function getAllTournaments(): Promise<Tournament[]> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tournaments:', error);
    return [];
  }
  return data || [];
}

export async function getTournament(id: number): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching tournament:', error);
    return null;
  }
  return data;
}

export async function createTournament(tournament: Omit<Tournament, 'id' | 'created_at'>): Promise<Tournament | null> {
  console.log('📝 Creating tournament:', JSON.stringify(tournament));

  const { data, error } = await supabase
    .from('tournaments')
    .insert(tournament)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating tournament:', error);
    return null;
  }

  if (data) {
    await createCourtsForTournament(data.id, tournament.court_count);
  }

  console.log('✅ Tournament created:', data?.id);
  return data;
}

export async function updateTournament(id: number, updates: Partial<Tournament>): Promise<Tournament | null> {
  const { data, error } = await supabase
    .from('tournaments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating tournament:', error);
    return null;
  }
  return data;
}

export async function deleteTournament(id: number): Promise<boolean> {
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting tournament:', error);
    return false;
  }

  console.log(`✅ Tournament ${id} deleted`);
  return true;
}

async function createCourtsForTournament(tournamentId: number, courtCount: number): Promise<void> {
  const courts = Array.from({ length: courtCount }, (_, i) => ({
    tournament_id: tournamentId,
    court_number: i + 1,
    name: `Court ${i + 1}`,
  }));

  const { error } = await supabase.from('courts').insert(courts);

  if (error) {
    console.error('Error creating courts for tournament:', error);
  } else {
    console.log(`✅ Created ${courtCount} courts for tournament ${tournamentId}`);
  }
}

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

export async function getCourtsByTournament(tournamentId: number): Promise<Court[]> {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('court_number', { ascending: true });

  if (error) {
    console.error('Error fetching courts for tournament:', error);
    return [];
  }
  return data || [];
}

export async function getCourtByTournamentAndNumber(
  tournamentId: number,
  courtNumber: number
): Promise<Court | null> {
  const { data, error } = await supabase
    .from('courts')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('court_number', courtNumber)
    .single();

  if (error) {
    console.error('Error fetching court by tournament and number:', error);
    return null;
  }
  return data;
}

// Court score state operations
export async function getCourtScoreState(courtId: number): Promise<CourtScoreState | null> {
  const { data, error } = await supabase
    .from('court_score_states')
    .select('*')
    .eq('court_id', courtId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // no row
    console.error('Error fetching court score state:', error);
    return null;
  }
  return data;
}

export async function upsertCourtScoreState(
  state: Omit<CourtScoreState, 'updated_at'> & { updated_at?: string }
): Promise<CourtScoreState | null> {
  const { data, error } = await supabase
    .from('court_score_states')
    .upsert(
      {
        ...state,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'court_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting court score state:', error);
    return null;
  }
  return data;
}

export async function resetCourtScoreState(courtId: number): Promise<CourtScoreState | null> {
  return upsertCourtScoreState({
    court_id: courtId,
    set_number: 1,
    left_score: 0,
    right_score: 0,
    sets_left: 0,
    sets_right: 0,
  });
}
