import axios from 'axios';
import { supabase } from './db';
import { Match } from './types';

// SportWrench API response types based on actual API response
interface SportWrenchMatch {
  gender: string | null;
  division_name: string;
  division_id: number;
  match_uuid: string;
  event: number;
  match_id: string;  // Format: "{event_id}_{division short name}_{match code}" e.g. "24724_14 O_R1P5M6"
  div: string;
  day: number;
  date_time: string;
  court: number;
  court_alpha: string;
  pool: string;
  team1_roster_id: number;
  team2_roster_id: number;
  ref_roster_id: number | null;
  team_1_name: string;
  team_2_name: string;
  master_team_id_1: number;
  master_team_id_2: number;
  ref_name: string | null;
  match_type: string;
  results: {
    set1?: string;
    set2?: string;
    set3?: string;
  } | null;
}

// Configuration
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory storage for SportWrench Event ID
let sportWrenchEventId: string | null = null;
let syncInterval: NodeJS.Timeout | null = null;
let socketIOInstance: any = null;

/**
 * Set the SportWrench Event ID (5-digit tournament ID)
 */
export function setSportWrenchEventId(eventId: string | null): void {
  sportWrenchEventId = eventId;
  console.log(`🏐 SportWrench Event ID set to: ${eventId || '(none)'}`);
}

/**
 * Get the current SportWrench Event ID
 */
export function getSportWrenchEventId(): string | null {
  return sportWrenchEventId;
}

/**
 * Fetch schedule from SportWrench API
 */
async function fetchSportWrenchSchedule(): Promise<SportWrenchMatch[]> {
  if (!sportWrenchEventId) {
    console.log('⚠️ SportWrench Event ID not configured, skipping fetch');
    return [];
  }

  const apiUrl = `https://my.sportwrench.com/api/tpc/export/${sportWrenchEventId}/schedule`;

  try {
    console.log(`📡 Fetching SportWrench schedule from: ${apiUrl}`);
    const response = await axios.get(apiUrl, {
      timeout: 30000 // 30 second timeout
    });
    
    const matches = response.data || [];
    console.log(`📊 Fetched ${matches.length} matches from SportWrench`);
    return matches;
  } catch (error: any) {
    if (error.response) {
      console.error(`❌ SportWrench API error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      console.error('❌ SportWrench API request failed (no response):', error.message);
    } else {
      console.error('❌ Failed to fetch SportWrench schedule:', error.message);
    }
    return [];
  }
}

/**
 * Get all local matches that have an external_match_id (from CSV MatchID column)
 */
async function getMatchesWithExternalId(): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .not('external_match_id', 'is', null);
  
  if (error) {
    console.error('Error fetching matches with external IDs:', error);
    return [];
  }
  return data || [];
}

/**
 * Update a match's team names in the database
 */
async function updateMatchTeamNames(matchId: number, teamA: string, teamB: string): Promise<boolean> {
  const { error } = await supabase
    .from('matches')
    .update({
      team_a: teamA,
      team_b: teamB
    })
    .eq('id', matchId);

  if (error) {
    console.error(`❌ Failed to update match ${matchId}:`, error);
    return false;
  }
  return true;
}

/**
 * Sync team names from SportWrench to local database
 * Uses external_match_id (from CSV) to match with SportWrench's match_id
 * Returns array of updated match IDs
 */
export async function syncFromSportWrench(): Promise<number[]> {
  if (!sportWrenchEventId) {
    console.log('⚠️ SportWrench Event ID not configured, skipping sync');
    return [];
  }

  console.log('🔄 Starting SportWrench sync...');
  
  // Fetch from SportWrench
  const swMatches = await fetchSportWrenchSchedule();
  if (swMatches.length === 0) {
    console.log('📭 No matches from SportWrench (or fetch failed)');
    return [];
  }

  // Create lookup map by match_id (this matches our external_match_id from CSV)
  const swMatchMap = new Map<string, SportWrenchMatch>();
  for (const match of swMatches) {
    swMatchMap.set(match.match_id, match);
  }
  console.log(`📋 SportWrench match_id lookup map created with ${swMatchMap.size} entries`);

  // Get local matches with external IDs
  const localMatches = await getMatchesWithExternalId();
  console.log(`📋 Found ${localMatches.length} local matches with external_match_id`);
  
  const updatedMatchIds: number[] = [];
  let checkedCount = 0;

  // Compare and update
  for (const localMatch of localMatches) {
    if (!localMatch.external_match_id) continue;
    
    const swMatch = swMatchMap.get(localMatch.external_match_id);
    
    if (!swMatch) {
      // No match found - this is normal if the MatchID format doesn't match
      continue;
    }

    checkedCount++;

    // Check if team names have changed
    const teamAChanged = localMatch.team_a !== swMatch.team_1_name;
    const teamBChanged = localMatch.team_b !== swMatch.team_2_name;

    if (teamAChanged || teamBChanged) {
      console.log(`📝 Updating match ${localMatch.id} (${localMatch.external_match_id}):`);
      if (teamAChanged) {
        console.log(`   Team A: "${localMatch.team_a}" → "${swMatch.team_1_name}"`);
      }
      if (teamBChanged) {
        console.log(`   Team B: "${localMatch.team_b}" → "${swMatch.team_2_name}"`);
      }

      const success = await updateMatchTeamNames(
        localMatch.id, 
        swMatch.team_1_name, 
        swMatch.team_2_name
      );

      if (success) {
        updatedMatchIds.push(localMatch.id);
      }
    }
  }

  if (updatedMatchIds.length > 0) {
    console.log(`✅ SportWrench sync complete: ${updatedMatchIds.length} matches updated (checked ${checkedCount})`);
  } else {
    console.log(`✅ SportWrench sync complete: No changes detected (checked ${checkedCount} matches)`);
  }

  return updatedMatchIds;
}

/**
 * Manually trigger a sync and return results
 */
export async function triggerManualSync(): Promise<{
  success: boolean;
  matchesUpdated: number;
  matchIds: number[];
  message: string;
}> {
  if (!sportWrenchEventId) {
    return {
      success: false,
      matchesUpdated: 0,
      matchIds: [],
      message: 'SportWrench Event ID not configured'
    };
  }

  try {
    const updatedIds = await syncFromSportWrench();
    
    // Broadcast updates if there were changes and socket.io is available
    if (socketIOInstance && updatedIds.length > 0) {
      socketIOInstance.emit('schedule:updated', { matchIds: updatedIds });
    }

    return {
      success: true,
      matchesUpdated: updatedIds.length,
      matchIds: updatedIds,
      message: updatedIds.length > 0 
        ? `Updated ${updatedIds.length} matches` 
        : 'No changes detected'
    };
  } catch (error: any) {
    return {
      success: false,
      matchesUpdated: 0,
      matchIds: [],
      message: error.message || 'Sync failed'
    };
  }
}

/**
 * Start the automatic sync polling
 */
export function startSportWrenchSync(io?: any): void {
  socketIOInstance = io;

  if (!sportWrenchEventId) {
    console.log('⚠️ SportWrench sync not started (no Event ID configured)');
    console.log('   Configure via Admin Panel → SportWrench Settings');
    return;
  }

  console.log(`🚀 Starting SportWrench sync (every ${SYNC_INTERVAL_MS / 1000 / 60} minutes)`);
  console.log(`   Event ID: ${sportWrenchEventId}`);
  
  // Run immediately on start
  syncFromSportWrench().then(updatedIds => {
    if (io && updatedIds.length > 0) {
      io.emit('schedule:updated', { matchIds: updatedIds });
    }
  });

  // Set up interval
  if (syncInterval) {
    clearInterval(syncInterval);
  }
  
  syncInterval = setInterval(async () => {
    const updatedIds = await syncFromSportWrench();
    if (io && updatedIds.length > 0) {
      // Broadcast to all connected clients
      io.emit('schedule:updated', { matchIds: updatedIds });
    }
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop the sync polling
 */
export function stopSportWrenchSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('🛑 SportWrench sync stopped');
  }
}

/**
 * Restart sync with new settings (called when Event ID changes)
 */
export function restartSportWrenchSync(): void {
  stopSportWrenchSync();
  if (sportWrenchEventId) {
    startSportWrenchSync(socketIOInstance);
  }
}

/**
 * Import matches from SportWrench into the database
 * Creates new matches with data from SportWrench API
 * Handles multi-day tournaments by sorting Day 1 before Day 2, etc.
 */
export async function importFromSportWrench(
  eventId: string,
  courtFilter?: { min: number; max: number }
): Promise<{
  success: boolean;
  imported: number;
  updated: number;
  errors: string[];
  dayStats: Record<number, number>;
}> {
  const apiUrl = `https://my.sportwrench.com/api/tpc/export/${eventId}/schedule`;
  
  console.log(`📥 Importing matches from SportWrench event ${eventId}...`);
  
  try {
    const response = await axios.get(apiUrl, { timeout: 30000 });
    let swMatches: SportWrenchMatch[] = response.data || [];
    
    console.log(`📊 Fetched ${swMatches.length} total matches from SportWrench`);
    
    // Filter by court if specified
    if (courtFilter) {
      swMatches = swMatches.filter(
        m => m.court >= courtFilter.min && m.court <= courtFilter.max
      );
      console.log(`🔍 Filtered to ${swMatches.length} matches for courts ${courtFilter.min}-${courtFilter.max}`);
    }
    
    // Sort by day first, then by date_time (ensures Day 1 matches come before Day 2)
    swMatches.sort((a, b) => {
      // Primary: sort by day
      if (a.day !== b.day) {
        return a.day - b.day;
      }
      // Secondary: sort by date_time
      return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
    });
    
    // Group matches by court for ordered insertion
    const matchesByCourt = new Map<number, SportWrenchMatch[]>();
    for (const match of swMatches) {
      if (!matchesByCourt.has(match.court)) {
        matchesByCourt.set(match.court, []);
      }
      matchesByCourt.get(match.court)!.push(match);
    }
    
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];
    
    // Process each court's matches in order
    for (const [courtId, matches] of matchesByCourt) {
      const daysOnCourt = new Set(matches.map(m => m.day)).size;
      console.log(`📋 Court ${courtId}: ${matches.length} matches across ${daysOnCourt} day(s)`);
      
      for (const swMatch of matches) {
        try {
          // Check if match already exists (by external_match_id)
          const { data: existing } = await supabase
            .from('matches')
            .select('id')
            .eq('external_match_id', swMatch.match_id)
            .maybeSingle();
          
          if (existing) {
            // Update existing match with latest team names
            const { error } = await supabase
              .from('matches')
              .update({
                team_a: swMatch.team_1_name,
                team_b: swMatch.team_2_name,
                start_time: swMatch.date_time,
                court_id: swMatch.court
              })
              .eq('id', existing.id);
            
            if (error) throw error;
            updated++;
          } else {
            // Create new match
            const { error } = await supabase
              .from('matches')
              .insert({
                court_id: swMatch.court,
                team_a: swMatch.team_1_name,
                team_b: swMatch.team_2_name,
                start_time: swMatch.date_time,
                external_match_id: swMatch.match_id,
                is_crossover: false, // Default, will be set by CSV upload
                is_completed: false,
                score_a: 0,
                score_b: 0,
                current_set: 1,
                set_scores: []
              });
            
            if (error) throw error;
            imported++;
          }
        } catch (err: any) {
          errors.push(`Match ${swMatch.match_id}: ${err.message}`);
        }
      }
    }
    
    // Calculate day distribution stats
    const dayStats = swMatches.reduce((acc, m) => {
      acc[m.day] = (acc[m.day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    console.log(`📅 Day distribution:`, dayStats);
    console.log(`✅ Import complete: ${imported} new, ${updated} updated, ${errors.length} errors`);
    
    return { success: true, imported, updated, errors, dayStats };
  } catch (error: any) {
    console.error('❌ Failed to import from SportWrench:', error.message);
    return {
      success: false,
      imported: 0,
      updated: 0,
      errors: [error.message],
      dayStats: {}
    };
  }
}

/**
 * Update crossover status for matches by external_match_id
 */
export async function updateCrossoverMappings(
  mappings: Array<{ matchId: string; isCrossover: boolean }>
): Promise<{ updated: number; notFound: number; errors: string[] }> {
  let updated = 0;
  let notFound = 0;
  const errors: string[] = [];
  
  for (const mapping of mappings) {
    const { matchId, isCrossover } = mapping;
    
    if (!matchId) continue;
    
    try {
      const { data, error } = await supabase
        .from('matches')
        .update({ is_crossover: !!isCrossover })
        .eq('external_match_id', matchId)
        .select('id');
      
      if (error) {
        errors.push(`${matchId}: ${error.message}`);
        continue;
      }
      
      if (data && data.length > 0) {
        updated++;
      } else {
        notFound++;
      }
    } catch (err: any) {
      errors.push(`${matchId}: ${err.message}`);
    }
  }
  
  console.log(`📋 Crossover mapping: ${updated} updated, ${notFound} not found, ${errors.length} errors`);
  
  return { updated, notFound, errors };
}

