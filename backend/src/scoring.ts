import { Match, ScoreState, ScoreUpdatePayload, SetScore } from './types';
import { getMatch, updateMatch, getScoreState, upsertScoreState, getCurrentMatch, updateMatchLogEndTime } from './db';
import { cacheScoreState, publishScoreUpdate } from './redis';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export function setSocketIO(socketInstance: SocketIOServer) {
  io = socketInstance;
}

// In-memory storage for set history (keyed by match_id)
const setHistoryCache = new Map<number, SetScore[]>();

function getSetHistory(matchId: number): SetScore[] {
  return setHistoryCache.get(matchId) || [];
}

function addSetToHistory(matchId: number, setScore: SetScore): void {
  const history = getSetHistory(matchId);
  history.push(setScore);
  setHistoryCache.set(matchId, history);
}

export function clearSetHistory(matchId: number): void {
  setHistoryCache.delete(matchId);
}

// Check if a set is won based on volleyball rules
function checkSetWin(scoreA: number, scoreB: number, setNumber: number): 'A' | 'B' | null {
  // Set 3 (deciding set) is played to 15, sets 1-2 are played to 25
  const targetScore = setNumber === 3 ? 15 : 25;
  
  // A set is won when a team reaches the target score with a 2-point lead
  if ((scoreA >= targetScore || scoreB >= targetScore) && Math.abs(scoreA - scoreB) >= 2) {
    return scoreA > scoreB ? 'A' : 'B';
  }
  return null;
}

// Build the score update payload
async function buildScorePayload(courtId: number, match: Match, scoreState: ScoreState, pendingSetWin?: 'A' | 'B' | null): Promise<ScoreUpdatePayload> {
  // Get set history from in-memory cache
  const setHistory = getSetHistory(match.id);
  
  return {
    courtId,
    matchId: match.id,
    teamA: match.team_a,
    teamB: match.team_b,
    teamAScore: scoreState.team_a_score,
    teamBScore: scoreState.team_b_score,
    setsA: match.sets_a,
    setsB: match.sets_b,
    setNumber: scoreState.set_number,
    setHistory,
    updatedAt: new Date().toISOString(),
    pendingSetWin: pendingSetWin || null,
    isCrossover: match.is_crossover || false
  };
}

// Broadcast score update via WebSocket and Redis
async function broadcastScoreUpdate(payload: ScoreUpdatePayload): Promise<void> {
  const { courtId } = payload;
  
  // Cache the score state
  await cacheScoreState(courtId, payload);
  
  // Broadcast via Socket.IO (only if initialized)
  if (io) {
    io.to(`court_${courtId}`).emit('score:update', payload);
  }
  
  // Publish to Redis for multi-instance sync
  await publishScoreUpdate(courtId, payload);
}

// Export a public function to broadcast score updates (for routes to use)
export async function broadcastScoreToClients(payload: ScoreUpdatePayload): Promise<void> {
  await broadcastScoreUpdate(payload);
}

// Increment score for a team
export async function incrementScore(courtId: number, team: 'A' | 'B'): Promise<ScoreUpdatePayload | null> {
  const match = await getCurrentMatch(courtId);
  if (!match) return null;

  let scoreState = await getScoreState(match.id);
  if (!scoreState) {
    // Initialize score state
    scoreState = {
      match_id: match.id,
      set_number: 1,
      team_a_score: 0,
      team_b_score: 0
    };
  }

  // Increment the appropriate team's score
  if (team === 'A') {
    scoreState.team_a_score += 1;
  } else {
    scoreState.team_b_score += 1;
  }

  // Check for set win
  const winner = checkSetWin(scoreState.team_a_score, scoreState.team_b_score, scoreState.set_number);
  
  // Save score state (but don't advance set yet if there's a winner)
  await upsertScoreState(scoreState);

  // Build and broadcast payload with pendingSetWin flag
  const payload = await buildScorePayload(courtId, match, scoreState, winner);
  await broadcastScoreUpdate(payload);

  return payload;
}

// Confirm set win and advance to next set
export async function confirmSetWin(courtId: number): Promise<ScoreUpdatePayload | null> {
  const match = await getCurrentMatch(courtId);
  if (!match) return null;

  const scoreState = await getScoreState(match.id);
  if (!scoreState) return null;

  // Check who won
  const winner = checkSetWin(scoreState.team_a_score, scoreState.team_b_score, scoreState.set_number);
  if (!winner) return null; // No winner, nothing to confirm

  // Save the final scores of this set to in-memory history
  addSetToHistory(match.id, {
    teamAScore: scoreState.team_a_score,
    teamBScore: scoreState.team_b_score
  });
  
  // Update sets won
  if (winner === 'A') {
    match.sets_a += 1;
  } else {
    match.sets_b += 1;
  }
  
  // Check if match is complete
  // Crossover match: 1 set only (first to win 1 set)
  // Regular match: Best of 3 (first to win 2 sets)
  const setsToWin = match.is_crossover ? 1 : 2;
  
  if (match.sets_a >= setsToWin || match.sets_b >= setsToWin) {
    match.is_completed = true;
    
    // 🆕 LOG MATCH END - Update the match log with end time
    await updateMatchLogEndTime(match.id);
    
    // 🔔 SEND MATCH END WEBHOOK
    const { sendMatchEndWebhook } = await import('./webhookClient');
    await sendMatchEndWebhook(courtId, match.external_match_id);
  }
  
  await updateMatch(match.id, {
    sets_a: match.sets_a,
    sets_b: match.sets_b,
    is_completed: match.is_completed
  });
  
  // Move to next set
  scoreState.set_number += 1;
  scoreState.team_a_score = 0;
  scoreState.team_b_score = 0;
  
  await upsertScoreState(scoreState);

  // Build and broadcast payload (no pending win anymore)
  const payload = await buildScorePayload(courtId, match, scoreState, null);
  await broadcastScoreUpdate(payload);

  return payload;
}

// Decrement score for a team
export async function decrementScore(courtId: number, team: 'A' | 'B'): Promise<ScoreUpdatePayload | null> {
  const match = await getCurrentMatch(courtId);
  if (!match) return null;

  const scoreState = await getScoreState(match.id);
  if (!scoreState) return null;

  // Decrement the appropriate team's score (don't go below 0)
  if (team === 'A') {
    scoreState.team_a_score = Math.max(0, scoreState.team_a_score - 1);
  } else {
    scoreState.team_b_score = Math.max(0, scoreState.team_b_score - 1);
  }

  // Save score state
  await upsertScoreState(scoreState);

  // Check if there's still a winner after decrement (for pendingSetWin)
  const winner = checkSetWin(scoreState.team_a_score, scoreState.team_b_score, scoreState.set_number);

  // Build and broadcast payload
  const payload = await buildScorePayload(courtId, match, scoreState, winner);
  await broadcastScoreUpdate(payload);

  return payload;
}

// Reset current set scores to 0-0
export async function resetSet(courtId: number): Promise<ScoreUpdatePayload | null> {
  const match = await getCurrentMatch(courtId);
  if (!match) return null;

  const scoreState = await getScoreState(match.id);
  if (!scoreState) return null;

  scoreState.team_a_score = 0;
  scoreState.team_b_score = 0;

  await upsertScoreState(scoreState);

  const payload = await buildScorePayload(courtId, match, scoreState);
  await broadcastScoreUpdate(payload);

  return payload;
}

// Swap team sides (swap team names and scores)
export async function swapSides(courtId: number): Promise<ScoreUpdatePayload | null> {
  const match = await getCurrentMatch(courtId);
  if (!match) return null;

  const scoreState = await getScoreState(match.id);
  if (!scoreState) return null;

  // Swap team names in match
  const tempTeam = match.team_a;
  match.team_a = match.team_b;
  match.team_b = tempTeam;

  // Swap sets
  const tempSets = match.sets_a;
  match.sets_a = match.sets_b;
  match.sets_b = tempSets;

  await updateMatch(match.id, {
    team_a: match.team_a,
    team_b: match.team_b,
    sets_a: match.sets_a,
    sets_b: match.sets_b
  });

  // Swap current scores
  const tempScore = scoreState.team_a_score;
  scoreState.team_a_score = scoreState.team_b_score;
  scoreState.team_b_score = tempScore;

  await upsertScoreState(scoreState);

  const payload = await buildScorePayload(courtId, match, scoreState);
  await broadcastScoreUpdate(payload);

  return payload;
}

// Get current score state for a court
export async function getCurrentScoreState(courtId: number): Promise<ScoreUpdatePayload | null> {
  const match = await getCurrentMatch(courtId);
  if (!match) return null;

  let scoreState = await getScoreState(match.id);
  if (!scoreState) {
    // Initialize score state if it doesn't exist
    scoreState = {
      match_id: match.id,
      set_number: 1,
      team_a_score: 0,
      team_b_score: 0
    };
    await upsertScoreState(scoreState);
  }

  return buildScorePayload(courtId, match, scoreState);
}

