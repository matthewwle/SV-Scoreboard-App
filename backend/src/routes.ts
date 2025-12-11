import { Router } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import {
  getCourt,
  getCurrentMatch,
  getAllCourts,
  createMatch,
  updateCourtMatch,
  getMatch,
  getUpcomingMatches,
  getNextMatch,
  initializeScoreState,
  updateMatch,
  createMatchLog,
  updateMatchLogEndTime,
  getAllMatchLogs,
  updateCourtLarixDeviceId,
  deleteMatchesForCourt,
  deleteAllMatches,
  getAllMatchesForCourt,
  deleteMatch,
  getMatchesAfter,
  getLastMatchForCourt
} from './db';
import {
  incrementScore,
  decrementScore,
  resetSet,
  swapSides,
  getCurrentScoreState,
  clearSetHistory,
  confirmSetWin
} from './scoring';
import { UploadScheduleRow } from './types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Court APIs
router.get('/court/:id', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id);
    const court = await getCourt(courtId);
    
    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }
    
    res.json(court);
  } catch (error) {
    console.error('Error fetching court:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/court/:id/currentMatch', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id);
    const match = await getCurrentMatch(courtId);
    
    if (!match) {
      return res.status(404).json({ error: 'No current match for this court' });
    }
    
    res.json(match);
  } catch (error) {
    console.error('Error fetching current match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/courts', async (req, res) => {
  try {
    const courts = await getAllCourts();
    res.json(courts);
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/court/:id/upcomingMatches', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
    const matches = await getUpcomingMatches(courtId, limit);
    res.json(matches);
  } catch (error) {
    console.error('Error fetching upcoming matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/court/:id/advanceToNextMatch', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id);
    
    // Check if there's already an active (non-completed) match in progress
    const currentMatch = await getCurrentMatch(courtId);
    if (currentMatch && !currentMatch.is_completed) {
      // A match is already in progress - don't start a new one
      // Return the current match info instead
      console.log(`⚠️ Court ${courtId}: Match ${currentMatch.id} already in progress, ignoring duplicate start request`);
      return res.json({
        ...currentMatch,
        alreadyInProgress: true,
        message: 'Match already in progress'
      });
    }
    
    // Mark the current match as completed (if it exists and wasn't already)
    if (currentMatch) {
      await updateMatch(currentMatch.id, { is_completed: true });
    }
    
    const nextMatch = await getNextMatch(courtId);
    
    if (!nextMatch) {
      return res.status(404).json({ error: 'No upcoming matches for this court' });
    }
    
    // Clear set history for the new match
    clearSetHistory(nextMatch.id);
    
    // Initialize fresh score state (all scores to 0)
    const scoreState = await initializeScoreState(nextMatch.id);
    
    // Update the court to use the next match
    await updateCourtMatch(courtId, nextMatch.id);
    
    // 🆕 LOG MATCH START - Create a match log when starting to score the next match
    await createMatchLog(courtId, nextMatch.id, nextMatch.team_a, nextMatch.team_b);
    
    // 🎥 START LARIX RECORDING - Trigger Larix to start recording
    let larixStartResult: { success: boolean; message?: string } = { success: false, message: 'Not configured' };
    const court = await getCourt(courtId);
    if (court?.larix_device_id) {
      const { startRecording } = await import('./larixClient');
      larixStartResult = await startRecording(courtId, nextMatch.id, court.larix_device_id);
      if (!larixStartResult.success) {
        console.warn(`⚠️  Larix recording start failed for Court ${courtId}: ${larixStartResult.message}`);
      }
    } else {
      console.log(`ℹ️  [Court ${courtId}] No Larix device configured - skipping recording start`);
    }
    
    // 🔔 SEND MATCH START WEBHOOK
    const { sendMatchStartWebhook, setTournamentLabel } = await import('./webhookClient');
    setTournamentLabel(tournamentLabel); // Sync tournament label
    await sendMatchStartWebhook(courtId, nextMatch.external_match_id, nextMatch.team_a, nextMatch.team_b);
    
    // Get the updated match and broadcast the initial state
    const updatedMatch = await getMatch(nextMatch.id);
    if (updatedMatch && scoreState) {
      const payload = {
        courtId,
        matchId: updatedMatch.id,
        teamA: updatedMatch.team_a,
        teamB: updatedMatch.team_b,
        teamAScore: scoreState.team_a_score,
        teamBScore: scoreState.team_b_score,
        setsA: updatedMatch.sets_a,
        setsB: updatedMatch.sets_b,
        setNumber: scoreState.set_number,
        setHistory: [],
        updatedAt: new Date().toISOString()
      };
      
      // Import the broadcast function
      const { broadcastScoreToClients } = await import('./scoring');
      await broadcastScoreToClients(payload);
    }
    
    // Return match data with Larix status
    res.json({
      ...nextMatch,
      larixRecordingStarted: larixStartResult.success,
      larixMessage: larixStartResult.message
    });
  } catch (error) {
    console.error('Error advancing to next match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/court/:id/resetCourtAssignment', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id);
    const court = await updateCourtMatch(courtId, null);
    
    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }
    
    res.json(court);
  } catch (error) {
    console.error('Error resetting court assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/court/:id/overrideMatch', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id);
    const { matchId } = req.body;
    
    // Verify match exists
    const match = await getMatch(matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    const court = await updateCourtMatch(courtId, matchId);
    
    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }
    
    res.json(court);
  } catch (error) {
    console.error('Error overriding match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Score APIs
router.post('/score/increment', async (req, res) => {
  try {
    console.log('Increment request received:', req.body);
    const { courtId, team } = req.body;
    
    if (!courtId || !team || !['A', 'B'].includes(team)) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    console.log(`Calling incrementScore for court ${courtId}, team ${team}`);
    const payload = await incrementScore(courtId, team);
    console.log('incrementScore completed, payload:', payload);
    
    if (!payload) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(payload);
  } catch (error) {
    console.error('Error incrementing score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/score/decrement', async (req, res) => {
  try {
    const { courtId, team } = req.body;
    
    if (!courtId || !team || !['A', 'B'].includes(team)) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const payload = await decrementScore(courtId, team);
    
    if (!payload) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(payload);
  } catch (error) {
    console.error('Error decrementing score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/score/resetSet', async (req, res) => {
  try {
    const { courtId } = req.body;
    
    if (!courtId) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const payload = await resetSet(courtId);
    
    if (!payload) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(payload);
  } catch (error) {
    console.error('Error resetting set:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/score/swapSides', async (req, res) => {
  try {
    const { courtId } = req.body;
    
    if (!courtId) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const payload = await swapSides(courtId);
    
    if (!payload) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(payload);
  } catch (error) {
    console.error('Error swapping sides:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/score/confirmSetWin', async (req, res) => {
  try {
    const { courtId } = req.body;
    
    if (!courtId) {
      return res.status(400).json({ error: 'Invalid request' });
    }
    
    const payload = await confirmSetWin(courtId);
    
    if (!payload) {
      return res.status(404).json({ error: 'No set win to confirm' });
    }
    
    res.json(payload);
  } catch (error) {
    console.error('Error confirming set win:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/score/current/:courtId', async (req, res) => {
  try {
    const courtId = parseInt(req.params.courtId);
    const payload = await getCurrentScoreState(courtId);
    
    if (!payload) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    res.json(payload);
  } catch (error) {
    console.error('Error fetching current score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Match Logs API
router.get('/logs/matches', async (req, res) => {
  try {
    const logs = await getAllMatchLogs();
    res.json(logs);
  } catch (error) {
    console.error('Error fetching match logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin - Spreadsheet Upload
router.post('/admin/uploadSchedule', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: UploadScheduleRow[] = XLSX.utils.sheet_to_json(sheet);
    
    // Clear ALL existing matches before uploading new schedule
    console.log(`🗑️ Clearing ALL existing matches before upload...`);
    await deleteAllMatches();
    console.log(`✅ All matches cleared`);
    
    const createdMatches = [];
    
    for (const row of rows) {
      // Check if this is a crossover match (1 set only)
      const isCrossover = row.Crossover?.toUpperCase() === 'Y';
      
      const match = await createMatch({
        court_id: row.Court,
        team_a: row.TeamA,
        team_b: row.TeamB,
        sets_a: 0,
        sets_b: 0,
        start_time: row.StartTime,
        is_completed: false,
        external_match_id: row.MatchID || null,
        is_crossover: isCrossover  // Crossover = 1 set only
      });
      
      if (match) {
        createdMatches.push(match);
        
        // DON'T auto-assign matches - require "Begin Match" button
        // This ensures all matches (including the first one) get logged properly
      }
    }
    
    console.log(`📊 Schedule uploaded: ${createdMatches.length} matches created`);
    
    res.json({
      success: true,
      matchesCreated: createdMatches.length,
      message: 'All previous matches cleared. New schedule uploaded.',
      matches: createdMatches
    });
  } catch (error) {
    console.error('Error uploading schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test Larix API connection
router.get('/admin/testLarix', async (req, res) => {
  try {
    const { testLarixConnection } = await import('./larixClient');
    const isConnected = await testLarixConnection();
    
    res.json({
      success: isConnected,
      message: isConnected 
        ? 'Larix API connection successful' 
        : 'Larix API connection failed. Check LARIX_API_URL and LARIX_API_TOKEN environment variables.'
    });
  } catch (error) {
    console.error('Error testing Larix connection:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error testing Larix connection' 
    });
  }
});

// Set or clear Larix device ID for a court
router.post('/admin/court/:id/larixDevice', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id);
    const { deviceId } = req.body;
    
    // Allow empty string to clear the device ID
    if (deviceId === undefined || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId (string) is required' });
    }
    
    // If empty string, set to null to clear the device ID
    const deviceIdToSave = deviceId.trim() === '' ? null : deviceId.trim();
    
    const court = await updateCourtLarixDeviceId(courtId, deviceIdToSave);
    
    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }
    
    const message = deviceIdToSave 
      ? `Larix device ID "${deviceIdToSave}" assigned to Court ${courtId}`
      : `Larix device ID removed from Court ${courtId}`;
    
    res.json({
      success: true,
      message,
      court
    });
  } catch (error) {
    console.error('Error setting Larix device ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all courts with their Larix device IDs
router.get('/admin/courts/larixDevices', async (req, res) => {
  try {
    const courts = await getAllCourts();
    const courtsWithDevices = courts.map(court => ({
      courtId: court.id,
      courtName: court.name,
      larixDeviceId: court.larix_device_id || null,
      hasCurrentMatch: !!court.current_match_id
    }));
    
    res.json(courtsWithDevices);
  } catch (error) {
    console.error('Error fetching courts with devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tournament Label Settings
// Simple in-memory storage (persists until server restart)
// For true persistence, could be stored in database
let tournamentLabel = 'Winter Formal';

// Get tournament label
router.get('/settings/tournamentLabel', (req, res) => {
  res.json({ label: tournamentLabel });
});

// Set tournament label
router.post('/settings/tournamentLabel', async (req, res) => {
  const { label } = req.body;
  
  if (!label || typeof label !== 'string') {
    return res.status(400).json({ error: 'Label (string) is required' });
  }
  
  tournamentLabel = label.trim();
  
  // Sync to webhook client so webhooks use the correct label
  const { setTournamentLabel } = await import('./webhookClient');
  setTournamentLabel(tournamentLabel);
  
  console.log(`🏷️ Tournament label updated to: "${tournamentLabel}"`);
  
  res.json({ 
    success: true, 
    label: tournamentLabel,
    message: `Tournament label updated to "${tournamentLabel}"` 
  });
});

// =====================================================
// SPORTWRENCH SETTINGS
// =====================================================

// Get SportWrench Event ID
router.get('/settings/sportwrenchEventId', async (req, res) => {
  const { getSportWrenchEventId } = await import('./sportwrenchSync');
  res.json({ eventId: getSportWrenchEventId() });
});

// Set SportWrench Event ID (5-digit tournament ID)
router.post('/settings/sportwrenchEventId', async (req, res) => {
  const { eventId } = req.body;
  
  // Allow empty string or null to clear the event ID
  const eventIdToSave = eventId?.trim() || null;
  
  // Validate format if provided (should be 5 digits)
  if (eventIdToSave && !/^\d{5}$/.test(eventIdToSave)) {
    return res.status(400).json({ 
      error: 'Event ID must be a 5-digit number (e.g., 12345)' 
    });
  }
  
  const { setSportWrenchEventId, restartSportWrenchSync } = await import('./sportwrenchSync');
  setSportWrenchEventId(eventIdToSave);
  
  // Restart sync with new settings
  restartSportWrenchSync();
  
  console.log(`🏐 SportWrench Event ID updated to: "${eventIdToSave || '(none)'}"`);
  
  res.json({ 
    success: true, 
    eventId: eventIdToSave,
    message: eventIdToSave 
      ? `SportWrench Event ID set to "${eventIdToSave}". Sync will run every 5 minutes.`
      : 'SportWrench Event ID cleared. Sync disabled.'
  });
});

// Manually trigger a SportWrench sync
router.post('/settings/sportwrenchSync', async (req, res) => {
  const { triggerManualSync, getSportWrenchEventId } = await import('./sportwrenchSync');
  
  if (!getSportWrenchEventId()) {
    return res.status(400).json({ 
      error: 'SportWrench Event ID not configured. Set it first in Admin Panel.' 
    });
  }
  
  console.log('🔄 Manual SportWrench sync triggered...');
  const result = await triggerManualSync();
  
  res.json(result);
});

// Get SportWrench sync status
router.get('/settings/sportwrenchStatus', async (req, res) => {
  const { getSportWrenchEventId } = await import('./sportwrenchSync');
  const eventId = getSportWrenchEventId();
  
  res.json({
    configured: !!eventId,
    eventId: eventId,
    syncIntervalMinutes: 5,
    apiUrl: eventId 
      ? `https://my.sportwrench.com/api/tpc/export/${eventId}/schedule`
      : null
  });
});

// Test SportWrench API connection (diagnostic endpoint)
router.get('/settings/sportwrenchTest', async (req, res) => {
  const eventId = req.query.eventId as string || '24724';
  const apiUrl = `https://my.sportwrench.com/api/tpc/export/${eventId}/schedule`;
  
  console.log(`🧪 Testing SportWrench API connection: ${apiUrl}`);
  
  try {
    const axios = (await import('axios')).default;
    const startTime = Date.now();
    
    const response = await axios.get(apiUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScoreboardSync/1.0)',
        'Accept': 'application/json'
      }
    });
    
    const duration = Date.now() - startTime;
    const isJsonArray = Array.isArray(response.data);
    const matchCount = isJsonArray ? response.data.length : 0;
    
    // Get sample match_id values
    const sampleMatchIds = isJsonArray 
      ? response.data.slice(0, 3).map((m: any) => m.match_id)
      : [];
    
    // Get court range info
    const courts: number[] = isJsonArray 
      ? response.data.map((m: any) => m.court).filter((c: any) => typeof c === 'number')
      : [];
    const uniqueCourts = [...new Set(courts)].sort((a, b) => a - b);
    const courtMin = uniqueCourts.length > 0 ? Math.min(...uniqueCourts) : null;
    const courtMax = uniqueCourts.length > 0 ? Math.max(...uniqueCourts) : null;
    
    console.log(`✅ SportWrench API test SUCCESS: ${matchCount} matches in ${duration}ms, courts ${courtMin}-${courtMax}`);
    
    res.json({
      success: true,
      apiUrl,
      statusCode: response.status,
      duration: `${duration}ms`,
      matchCount,
      isValidResponse: isJsonArray,
      sampleMatchIds,
      courtRange: { min: courtMin, max: courtMax, total: uniqueCourts.length },
      message: `Successfully fetched ${matchCount} matches from SportWrench (courts ${courtMin}-${courtMax})`
    });
  } catch (error: any) {
    const duration = Date.now();
    
    // Check if it's a Cloudflare block
    const isCloudflareBlock = error.response?.data?.includes?.('Just a moment') ||
                              error.response?.data?.includes?.('Enable JavaScript');
    
    console.error(`❌ SportWrench API test FAILED:`, error.message);
    
    res.json({
      success: false,
      apiUrl,
      statusCode: error.response?.status || null,
      error: error.message,
      isCloudflareBlock,
      responsePreview: typeof error.response?.data === 'string' 
        ? error.response.data.substring(0, 200) 
        : null,
      suggestion: isCloudflareBlock 
        ? 'Cloudflare is blocking requests. Contact SportWrench to whitelist your server IP.'
        : 'Check network connectivity and API URL.'
    });
  }
});

// Import matches from SportWrench (creates matches in database)
router.post('/schedule/import-from-sportwrench', async (req, res) => {
  const { eventId, courtMin, courtMax } = req.body;
  
  if (!eventId) {
    return res.status(400).json({ error: 'Event ID is required' });
  }
  
  // Validate event ID format
  if (!/^\d{5}$/.test(eventId)) {
    return res.status(400).json({ error: 'Event ID must be a 5-digit number' });
  }
  
  const { importFromSportWrench } = await import('./sportwrenchSync');
  
  const courtFilter = (courtMin !== undefined && courtMax !== undefined)
    ? { min: parseInt(courtMin), max: parseInt(courtMax) }
    : undefined;
  
  console.log(`📥 Import request: Event ${eventId}, Courts: ${courtFilter ? `${courtFilter.min}-${courtFilter.max}` : 'all'}`);
  
  // Clear existing matches and import fresh from SportWrench
  const result = await importFromSportWrench(eventId, courtFilter, true);
  
  res.json({
    success: result.success,
    message: result.success
      ? `Cleared ${result.cleared} old matches. Imported ${result.imported} new matches. (Event: ${eventId}, Courts: ${courtFilter?.min || 'all'}-${courtFilter?.max || 'all'})`
      : 'Import failed',
    cleared: result.cleared,
    imported: result.imported,
    updated: result.updated,
    eventIdUsed: eventId,
    courtFilter: courtFilter,
    dayStats: result.dayStats,
    errors: result.errors.slice(0, 10) // Limit error output
  });
});

// Upload CSV for crossover mapping (MatchID, IsCrossover)
router.post('/schedule/upload-crossover-mapping', async (req, res) => {
  try {
    const { mappings } = req.body;
    // mappings = [{ matchId: "24724_14 O_R1P5M6", isCrossover: true }, ...]
    
    if (!Array.isArray(mappings)) {
      return res.status(400).json({ error: 'mappings array is required' });
    }
    
    const { updateCrossoverMappings } = await import('./sportwrenchSync');
    const result = await updateCrossoverMappings(mappings);
    
    res.json({
      success: true,
      message: `Updated ${result.updated} matches, ${result.notFound} not found`,
      updated: result.updated,
      notFound: result.notFound,
      errors: result.errors.slice(0, 10)
    });
  } catch (error: any) {
    console.error('Crossover mapping error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// SCHEDULE EDITOR APIs
// =====================================================

// Get all matches for a court (for Schedule Editor)
router.get('/schedule/:courtId', async (req, res) => {
  try {
    const courtId = parseInt(req.params.courtId);
    const matches = await getAllMatchesForCourt(courtId);
    
    res.json({
      courtId,
      schedule: matches.map(m => ({
        id: m.id,
        time: m.start_time,
        teamA: m.team_a,
        teamB: m.team_b,
        externalMatchId: m.external_match_id,
        isCompleted: m.is_completed,
        isCrossover: m.is_crossover || false
      }))
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle crossover status for a match
router.post('/schedule/match/:matchId/crossover', async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    const { isCrossover } = req.body;
    
    if (typeof isCrossover !== 'boolean') {
      return res.status(400).json({ error: 'isCrossover must be a boolean' });
    }
    
    const updatedMatch = await updateMatch(matchId, {
      is_crossover: isCrossover
    });
    
    if (!updatedMatch) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    console.log(`🔄 Match ${matchId} crossover set to: ${isCrossover}`);
    
    res.json({
      success: true,
      matchId,
      isCrossover,
      message: `Match ${matchId} crossover ${isCrossover ? 'enabled' : 'disabled'}`
    });
  } catch (error) {
    console.error('Error updating crossover status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a single match (team names only)
router.post('/schedule/:courtId/update', async (req, res) => {
  try {
    const courtId = parseInt(req.params.courtId);
    const { id, teamA, teamB } = req.body;
    
    if (!id || !teamA || !teamB) {
      return res.status(400).json({ error: 'id, teamA, and teamB are required' });
    }
    
    // Verify match belongs to this court
    const match = await getMatch(id);
    if (!match || match.court_id !== courtId) {
      return res.status(404).json({ error: 'Match not found on this court' });
    }
    
    const updatedMatch = await updateMatch(id, {
      team_a: teamA.trim(),
      team_b: teamB.trim()
    });
    
    if (!updatedMatch) {
      return res.status(500).json({ error: 'Failed to update match' });
    }
    
    console.log(`📝 Schedule updated: Match ${id} on Court ${courtId} - ${teamA} vs ${teamB}`);
    
    res.json({
      success: true,
      message: 'Game updated',
      match: {
        id: updatedMatch.id,
        time: updatedMatch.start_time,
        teamA: updatedMatch.team_a,
        teamB: updatedMatch.team_b
      }
    });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a match and shift later games up by 1 hour
router.delete('/schedule/:courtId/:matchId', async (req, res) => {
  try {
    const courtId = parseInt(req.params.courtId);
    const matchId = parseInt(req.params.matchId);
    
    // Get the match to delete
    const matchToDelete = await getMatch(matchId);
    if (!matchToDelete || matchToDelete.court_id !== courtId) {
      return res.status(404).json({ error: 'Match not found on this court' });
    }
    
    // Get all matches after this one (to shift times)
    const laterMatches = await getMatchesAfter(courtId, matchId);
    
    // Delete the match
    const deleted = await deleteMatch(matchId);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete match' });
    }
    
    // Shift later matches up by 1 hour
    for (const match of laterMatches) {
      const currentTime = new Date(match.start_time);
      currentTime.setHours(currentTime.getHours() - 1);
      await updateMatch(match.id, { start_time: currentTime.toISOString() });
    }
    
    console.log(`🗑️ Schedule: Deleted match ${matchId} on Court ${courtId}, shifted ${laterMatches.length} later games`);
    
    res.json({
      success: true,
      message: 'Game deleted',
      gamesShifted: laterMatches.length
    });
  } catch (error) {
    console.error('Error deleting from schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to add 1 hour to a time string
function addOneHourToTimeString(timeStr: string): string {
  // Handle formats like "8:00 AM", "10:30 PM", "09:00"
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    // If can't parse, just append " +1hr" or return a default
    return timeStr;
  }
  
  let hours = parseInt(match[1]);
  const minutes = match[2];
  const period = match[3]?.toUpperCase();
  
  if (period) {
    // 12-hour format
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    // Add 1 hour
    hours = (hours + 1) % 24;
    
    // Convert back to 12-hour format
    const newPeriod = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${newPeriod}`;
  } else {
    // 24-hour format
    hours = (hours + 1) % 24;
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }
}

// Add a new game at the end of the schedule
router.post('/schedule/:courtId/add', async (req, res) => {
  try {
    const courtId = parseInt(req.params.courtId);
    const { teamA, teamB, externalMatchId } = req.body;
    
    if (!teamA || !teamB) {
      return res.status(400).json({ error: 'teamA and teamB are required' });
    }
    
    // Get the last match to calculate the new time
    const lastMatch = await getLastMatchForCourt(courtId);
    
    let newStartTime: string;
    if (lastMatch && lastMatch.start_time) {
      // Add 1 hour to the last match time
      newStartTime = addOneHourToTimeString(lastMatch.start_time);
    } else {
      // Default to 8:00 AM if no matches exist
      newStartTime = '8:00 AM';
    }
    
    console.log(`➕ Attempting to add match on Court ${courtId}: ${teamA} vs ${teamB} at ${newStartTime}`);
    
    const newMatch = await createMatch({
      court_id: courtId,
      team_a: teamA.trim(),
      team_b: teamB.trim(),
      sets_a: 0,
      sets_b: 0,
      start_time: newStartTime,
      is_completed: false
      // Note: external_match_id removed - column may not exist in database
    });
    
    if (!newMatch) {
      console.error(`❌ Failed to create match on Court ${courtId}`);
      return res.status(500).json({ error: 'Failed to create match - check database logs' });
    }
    
    console.log(`✅ Schedule: Added new match on Court ${courtId} - ${teamA} vs ${teamB} at ${newStartTime}`);
    
    res.json({
      success: true,
      message: 'Game added',
      match: {
        id: newMatch.id,
        time: newMatch.start_time,
        teamA: newMatch.team_a,
        teamB: newMatch.team_b,
        externalMatchId: newMatch.external_match_id
      }
    });
  } catch (error) {
    console.error('Error adding to schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

