import { Router } from 'express';
import {
  getAllTournaments,
  getTournament,
  createTournament,
  updateTournament,
  deleteTournament,
  getCourtsByTournament,
  getCourtByTournamentAndNumber,
  getCourt,
  getAllCourts,
} from './db';
import {
  incrementScore,
  decrementScore,
  resetSet,
  getCurrentScoreState,
  confirmSetWin,
  resetGame,
} from './scoring';

const router = Router();

// =====================================================
// TOURNAMENT APIs
// =====================================================

// Get all tournaments
router.get('/tournaments', async (req, res) => {
  try {
    const tournaments = await getAllTournaments();
    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single tournament
router.get('/tournaments/:id', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const tournament = await getTournament(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a tournament
router.post('/tournaments', async (req, res) => {
  try {
    const { label, courtCount } = req.body;

    if (!label || !courtCount) {
      return res.status(400).json({ error: 'label and courtCount are required' });
    }

    if (typeof courtCount !== 'number' || courtCount < 1 || courtCount > 100) {
      return res.status(400).json({ error: 'courtCount must be a number between 1 and 100' });
    }

    const tournament = await createTournament({
      label: label.trim(),
      court_count: courtCount,
      is_active: true,
    });
    
    if (!tournament) {
      return res.status(500).json({ error: 'Failed to create tournament' });
    }
    
    res.json({
      success: true,
      tournament,
      message: `Tournament "${tournament.label}" created with ${courtCount} courts`
    });
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a tournament
router.patch('/tournaments/:id', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const { label, isActive } = req.body;

    const updates: Record<string, unknown> = {};
    if (label !== undefined) updates.label = label.trim();
    if (isActive !== undefined) updates.is_active = isActive;

    const tournament = await updateTournament(tournamentId, updates);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json({
      success: true,
      tournament,
      message: 'Tournament updated'
    });
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a tournament
router.delete('/tournaments/:id', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const success = await deleteTournament(tournamentId);
    
    if (!success) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json({
      success: true,
      message: 'Tournament deleted'
    });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get courts for a tournament
router.get('/tournaments/:id/courts', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const courts = await getCourtsByTournament(tournamentId);
    res.json(courts);
  } catch (error) {
    console.error('Error fetching courts for tournament:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current score state by tournament and court number
router.get('/tournaments/:tid/courts/:courtNum/score', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.tid);
    const courtNumber = parseInt(req.params.courtNum);

    const court = await getCourtByTournamentAndNumber(tournamentId, courtNumber);
    if (!court) {
      return res.status(404).json({ error: 'Court not found' });
    }

    const payload = await getCurrentScoreState(court.id);
    if (!payload) {
      return res.status(404).json({ error: 'Score state not found' });
    }
    res.json(payload);
  } catch (error) {
    console.error('Error fetching score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =====================================================
// COURT APIs
// =====================================================
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

router.get('/court/:id/score', async (req, res) => {
  try {
    const courtId = parseInt(req.params.id);
    const payload = await getCurrentScoreState(courtId);
    if (!payload) {
      return res.status(404).json({ error: 'Score state not found' });
    }
    res.json(payload);
  } catch (error) {
    console.error('Error fetching score:', error);
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

// Score APIs
router.post('/score/increment', async (req, res) => {
  try {
    const { courtId, side } = req.body;
    if (!courtId || !side || !['left', 'right'].includes(side)) {
      return res.status(400).json({ error: 'courtId and side (left|right) are required' });
    }
    const payload = await incrementScore(courtId, side);
    if (!payload) {
      return res.status(404).json({ error: 'Court not found' });
    }
    res.json(payload);
  } catch (error) {
    console.error('Error incrementing score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/score/decrement', async (req, res) => {
  try {
    const { courtId, side } = req.body;
    if (!courtId || !side || !['left', 'right'].includes(side)) {
      return res.status(400).json({ error: 'courtId and side (left|right) are required' });
    }
    const payload = await decrementScore(courtId, side);
    if (!payload) {
      return res.status(404).json({ error: 'Court not found' });
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
      return res.status(400).json({ error: 'courtId is required' });
    }
    const payload = await resetSet(courtId);
    if (!payload) {
      return res.status(404).json({ error: 'Court not found' });
    }
    res.json(payload);
  } catch (error) {
    console.error('Error resetting set:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/score/confirmSetWin', async (req, res) => {
  try {
    const { courtId } = req.body;
    if (!courtId) {
      return res.status(400).json({ error: 'courtId is required' });
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

router.post('/score/resetGame', async (req, res) => {
  try {
    const { courtId } = req.body;
    if (!courtId) {
      return res.status(400).json({ error: 'courtId is required' });
    }
    const payload = await resetGame(courtId);
    if (!payload) {
      return res.status(404).json({ error: 'Court not found' });
    }
    res.json(payload);
  } catch (error) {
    console.error('Error resetting game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/score/current/:courtId', async (req, res) => {
  try {
    const courtId = parseInt(req.params.courtId);
    const payload = await getCurrentScoreState(courtId);
    if (!payload) {
      return res.status(404).json({ error: 'Score state not found' });
    }
    res.json(payload);
  } catch (error) {
    console.error('Error fetching current score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tournament Label Settings (per-tournament)
// Get tournament label
router.get('/tournaments/:id/label', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const tournament = await getTournament(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    res.json({ label: tournament.label });
  } catch (error) {
    console.error('Error fetching tournament label:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set tournament label
router.post('/tournaments/:id/label', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const { label } = req.body;
    
    if (!label || typeof label !== 'string') {
      return res.status(400).json({ error: 'Label (string) is required' });
    }
    
    const tournament = await updateTournament(tournamentId, {
      label: label.trim()
    });
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    
    console.log(`🏷️ Tournament ${tournamentId} label updated to: "${tournament.label}"`);
    
    res.json({ 
      success: true, 
      label: tournament.label,
      message: `Tournament label updated to "${tournament.label}"` 
    });
  } catch (error) {
    console.error('Error updating tournament label:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
