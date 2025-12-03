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
  deleteMatchesForCourt
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
    
    // Mark the current match as completed
    const currentMatch = await getCurrentMatch(courtId);
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
    await sendMatchStartWebhook(courtId, nextMatch.id);
    
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
    
    // Get unique court IDs from the upload
    const courtIds = [...new Set(rows.map(row => row.Court))];
    
    // Reset each court: delete old matches and clear current match
    console.log(`🔄 Resetting ${courtIds.length} courts for new schedule...`);
    for (const courtId of courtIds) {
      // Delete all existing matches for this court
      await deleteMatchesForCourt(courtId);
      // Reset current match to null (goes back to pause screen)
      await updateCourtMatch(courtId, null);
      console.log(`✅ Court ${courtId} reset`);
    }
    
    const createdMatches = [];
    
    for (const row of rows) {
      const match = await createMatch({
        court_id: row.Court,
        team_a: row.TeamA,
        team_b: row.TeamB,
        sets_a: 0,
        sets_b: 0,
        start_time: row.StartTime,
        is_completed: false
      });
      
      if (match) {
        createdMatches.push(match);
        
        // DON'T auto-assign matches - require "Begin Match" button
        // This ensures all matches (including the first one) get logged properly
      }
    }
    
    console.log(`📊 Schedule uploaded: ${createdMatches.length} matches created for ${courtIds.length} courts`);
    
    res.json({
      success: true,
      matchesCreated: createdMatches.length,
      courtsReset: courtIds.length,
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

// Set Larix device ID for a court
router.post('/admin/court/:id/larixDevice', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id);
    const { deviceId } = req.body;
    
    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId (string) is required' });
    }
    
    const court = await updateCourtLarixDeviceId(courtId, deviceId);
    
    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }
    
    res.json({
      success: true,
      message: `Larix device ID "${deviceId}" assigned to Court ${courtId}`,
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
router.post('/settings/tournamentLabel', (req, res) => {
  const { label } = req.body;
  
  if (!label || typeof label !== 'string') {
    return res.status(400).json({ error: 'Label (string) is required' });
  }
  
  tournamentLabel = label.trim();
  console.log(`🏷️ Tournament label updated to: "${tournamentLabel}"`);
  
  res.json({ 
    success: true, 
    label: tournamentLabel,
    message: `Tournament label updated to "${tournamentLabel}"` 
  });
});

export default router;

