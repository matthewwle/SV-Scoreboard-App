import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useSocket } from '../hooks/useSocket';
import { Tournament, Court } from '../types';

function ControlUI() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showTournamentSelect, setShowTournamentSelect] = useState(true);
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showCourtSelect, setShowCourtSelect] = useState(false);
  const [showPauseScreen, setShowPauseScreen] = useState(false);
  const [showSetWinModal, setShowSetWinModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [tournamentLabel, setTournamentLabel] = useState('');

  const { scoreState, isConnected } = useSocket(selectedCourt);

  // Load tournaments on mount
  useEffect(() => {
    loadTournaments();
  }, []);

  // Load selected tournament details and courts when tournament changes
  useEffect(() => {
    if (selectedTournamentId) {
      loadTournamentDetails(selectedTournamentId);
      loadCourtsForTournament(selectedTournamentId);
      // Save to localStorage
      localStorage.setItem('controlTournamentId', String(selectedTournamentId));
    } else {
      // Try to load from localStorage
      const savedTournamentId = localStorage.getItem('controlTournamentId');
      if (savedTournamentId) {
        const id = parseInt(savedTournamentId);
        if (!isNaN(id)) {
          setSelectedTournamentId(id);
        }
      }
    }
  }, [selectedTournamentId]);

  // Fetch tournament label when tournament is selected
  useEffect(() => {
    if (selectedTournamentId) {
      async function fetchTournamentLabel() {
        try {
          const response = await fetch(`${API_URL}/api/tournaments/${selectedTournamentId}/label`);
          if (response.ok) {
            const data = await response.json();
            setTournamentLabel(data.label || '');
          }
        } catch (error) {
          console.error('Error fetching tournament label:', error);
        }
      }
      fetchTournamentLabel();
      // Refresh every 30 seconds in case it's changed
      const interval = setInterval(fetchTournamentLabel, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedTournamentId]);

  async function loadTournaments() {
    try {
      const response = await fetch(`${API_URL}/api/tournaments`);
      if (response.ok) {
        const data = await response.json();
        setTournaments(data);
        // Auto-select first tournament if none selected
        if (!selectedTournamentId && data.length > 0) {
          setSelectedTournamentId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    }
  }

  async function loadTournamentDetails(tournamentId: number) {
    try {
      const response = await fetch(`${API_URL}/api/tournaments/${tournamentId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTournament(data);
      }
    } catch (error) {
      console.error('Error loading tournament details:', error);
    }
  }

  async function loadCourtsForTournament(tournamentId: number) {
    try {
      const response = await fetch(`${API_URL}/api/tournaments/${tournamentId}/courts`);
      if (response.ok) {
        const data = await response.json();
        setCourts(data);
      }
    } catch (error) {
      console.error('Error fetching courts:', error);
    }
  }

  // Toast notification helper
  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000); // Auto-hide after 4 seconds
  }

  // Game over: first to 2 sets wins (best of 3)
  const isGameComplete = scoreState && (scoreState.setsLeft >= 2 || scoreState.setsRight >= 2);

  // Show modal when a set is won
  useEffect(() => {
    if (scoreState?.pendingSetWin && !showSetWinModal) {
      setShowSetWinModal(true);
    } else if (!scoreState?.pendingSetWin && showSetWinModal) {
      setShowSetWinModal(false);
    }
  }, [scoreState?.pendingSetWin]);

  // Load court selection from localStorage (after tournament is selected)
  useEffect(() => {
    if (selectedTournamentId && courts.length > 0) {
      const savedCourt = localStorage.getItem('controlCourtId');
      if (savedCourt) {
        const courtId = parseInt(savedCourt);
        if (courts.find(c => c.id === courtId)) {
          setSelectedCourt(courtId);
          setShowCourtSelect(false);
        }
      } else {
        setShowCourtSelect(true);
      }
    }
  }, [selectedTournamentId, courts]);

  // Show pause screen when game is complete
  useEffect(() => {
    if (isGameComplete && !showPauseScreen) {
      setShowPauseScreen(true);
    }
  }, [isGameComplete]);

  // Handle tournament selection
  function handleTournamentSelect(tournamentId: number) {
    setSelectedTournamentId(tournamentId);
    setShowTournamentSelect(false);
    setShowCourtSelect(true);
    // Clear selected court when tournament changes
    setSelectedCourt(null);
    localStorage.removeItem('controlCourtId');
  }

  // Handle court selection
  function handleCourtSelect(courtId: number) {
    setSelectedCourt(courtId);
    setShowCourtSelect(false);
    localStorage.setItem('controlCourtId', String(courtId));
  }

  async function handleStartNextGame() {
    if (!selectedCourt) return;
    try {
      const response = await fetch(`${API_URL}/api/score/resetGame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt }),
      });
      if (response.ok) {
        setShowPauseScreen(false);
      } else {
        showToast('Failed to reset game', 'error');
      }
    } catch (error) {
      console.error('Error resetting game:', error);
      showToast('Could not reset game. Check connection.', 'error');
    }
  }

  function handleLogoTap() {
    const newTaps = logoTaps + 1;
    setLogoTaps(newTaps);
    
    if (newTaps >= 5) {
      // Reset tournament and court selection
      localStorage.removeItem('controlTournamentId');
      localStorage.removeItem('controlCourtId');
      setSelectedTournamentId(null);
      setSelectedTournament(null);
      setSelectedCourt(null);
      setShowTournamentSelect(true);
      setShowCourtSelect(false);
      setLogoTaps(0);
      alert('Tournament and court selection reset!');
    }
    
    // Reset tap count after 2 seconds
    setTimeout(() => setLogoTaps(0), 2000);
  }

  async function handleScoreChange(side: 'left' | 'right', action: 'increment' | 'decrement') {
    if (!selectedCourt) return;
    try {
      const response = await fetch(`${API_URL}/api/score/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt, side }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        showToast(data.error || 'Failed to update score', 'error');
      }
    } catch (error) {
      console.error('Error updating score:', error);
      showToast('Could not update score. Check connection.', 'error');
    }
  }

  async function handleResetSet() {
    if (!selectedCourt) return;
    if (!confirm('Reset current set to 0-0?')) return;

    try {
      await fetch(`${API_URL}/api/score/resetSet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt })
      });
    } catch (error) {
      console.error('Error resetting set:', error);
    }
  }

  async function handleConfirmSetWin() {
    if (!selectedCourt) return;
    try {
      await fetch(`${API_URL}/api/score/confirmSetWin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt }),
      });
      setShowSetWinModal(false);
    } catch (error) {
      console.error('Error confirming set win:', error);
    }
  }

  async function handleUndoSetWin() {
    if (!selectedCourt || !scoreState?.pendingSetWin) return;
    try {
      await fetch(`${API_URL}/api/score/decrement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt, side: scoreState.pendingSetWin }),
      });
      setShowSetWinModal(false);
    } catch (error) {
      console.error('Error undoing set win:', error);
    }
  }

  // Tournament selection screen
  if (showTournamentSelect) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#000429' }}>
        <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full" style={{ backgroundColor: '#1a1a3e' }}>
          <h1 className="text-3xl font-bold text-center mb-6" style={{ color: '#DDFD51' }}>
            Select Tournament
          </h1>
          {tournaments.length === 0 ? (
            <div className="text-center" style={{ color: '#9a9ab8' }}>
              <p className="mb-4">No tournaments available.</p>
              <p className="text-sm">Please create a tournament in the Admin Panel first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tournaments.map((tournament) => (
                <button
                  key={tournament.id}
                  onClick={() => handleTournamentSelect(tournament.id)}
                  className="w-full font-bold py-4 px-6 rounded-lg transition-opacity hover:opacity-80 text-left"
                  style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                >
                  <div className="text-xl">{tournament.label}</div>
                  <div className="text-sm opacity-75">{tournament.court_count} courts</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Court selection screen (after tournament is selected)
  if (showCourtSelect) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#000429' }}>
        <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full" style={{ backgroundColor: '#1a1a3e' }}>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold" style={{ color: '#DDFD51' }}>
              Select Court
            </h1>
            <button
              onClick={() => {
                setShowTournamentSelect(true);
                setShowCourtSelect(false);
              }}
              className="text-sm font-semibold py-2 px-4 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#9a9ab8', color: '#000429' }}
            >
              Change Tournament
            </button>
          </div>
          {selectedTournament && (
            <p className="text-sm mb-6 text-center" style={{ color: '#9a9ab8' }}>
              {selectedTournament.label}
            </p>
          )}
          <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {courts.map((court) => (
              <button
                key={court.id}
                onClick={() => handleCourtSelect(court.id)}
                className="font-bold py-4 px-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                {court.court_number}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Pause screen - shown when game is complete
  if (showPauseScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#000429' }}>
        <div className="rounded-2xl shadow-2xl p-8 max-w-2xl w-full" style={{ backgroundColor: '#1a1a3e' }}>
          <h1 className="text-4xl font-bold text-center mb-4" style={{ color: '#DDFD51' }}>
            Game Complete! 🎉
          </h1>

          {scoreState && (
            <div className="text-center mb-8">
              <div className="text-2xl font-semibold mb-2" style={{ color: 'white' }}>
                Left vs Right
              </div>
              <div className="text-xl" style={{ color: '#9a9ab8' }}>
                Final: {scoreState.setsLeft} - {scoreState.setsRight} sets
              </div>
            </div>
          )}

          <button
            onClick={handleStartNextGame}
            className="w-full font-bold py-6 px-6 rounded-xl text-2xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#DDFD51', color: '#000429' }}
          >
            Start next game
          </button>

          <button
            onClick={() => {
              localStorage.removeItem('controlCourtId');
              setSelectedCourt(null);
              setShowCourtSelect(true);
              setShowPauseScreen(false);
            }}
            className="w-full mt-4 font-bold py-4 px-6 rounded-xl text-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#2a2a4e', color: '#9a9ab8', border: '1px solid #9a9ab8' }}
          >
            ← Change Court
          </button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 py-4 text-center font-bold text-xl" style={{ backgroundColor: '#DDFD51', color: '#000429' }}>
          {tournamentLabel} Court {courts.find(c => c.id === selectedCourt)?.court_number || selectedCourt}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#000429' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          className="fixed top-4 right-4 z-50 rounded-lg shadow-2xl p-4 max-w-md animate-slide-in"
          style={{ 
            backgroundColor: toastType === 'error' ? '#ef4444' : toastType === 'warning' ? '#f59e0b' : '#10b981',
            color: 'white'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="text-xl">
              {toastType === 'error' ? '❌' : toastType === 'warning' ? '⚠️' : '✅'}
            </div>
            <div className="font-semibold">{toastMessage}</div>
            <button 
              onClick={() => setToastMessage(null)}
              className="ml-auto text-white hover:opacity-75 text-xl"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Set Win Confirmation Modal */}
      {showSetWinModal && scoreState?.pendingSetWin && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full" style={{ backgroundColor: '#1a1a3e' }}>
            <h2 className="text-3xl font-bold text-center mb-4" style={{ color: '#DDFD51' }}>
              Set Won! 🎉
            </h2>
            <div className="text-center mb-8">
              <div className="text-2xl font-semibold mb-2" style={{ color: 'white' }}>
                {scoreState.pendingSetWin === 'left' ? 'Left' : 'Right'}
              </div>
              <div className="text-xl" style={{ color: '#9a9ab8' }}>
                wins Set {scoreState.setNumber}
              </div>
              <div className="text-4xl font-bold mt-4" style={{ color: '#DDFD51' }}>
                {scoreState.leftScore} - {scoreState.rightScore}
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={handleConfirmSetWin}
                className="w-full font-bold py-4 px-6 rounded-xl text-xl transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                Start Scoring Next Set
              </button>
              <button
                onClick={handleUndoSetWin}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl text-xl transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="rounded-xl shadow-lg p-4 flex items-center justify-between" style={{ backgroundColor: '#1a1a3e' }}>
          <div 
            onClick={handleLogoTap}
            className="text-2xl font-bold cursor-pointer select-none"
            style={{ color: '#DDFD51' }}
          >
            🏐 Scoreboard
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm" style={{ color: '#DDFD51' }}>
              Court {courts.find(c => c.id === selectedCourt)?.court_number || selectedCourt}
            </div>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Set info */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: '#1a1a3e' }}>
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2" style={{ color: '#DDFD51' }}>
              Set {scoreState?.setNumber || 1}
            </h2>
            <div className="text-sm" style={{ color: '#9a9ab8' }}>
              Best of 3 • First to 25 (Set 3 to 15, win by 2)
            </div>
          </div>
        </div>
      </div>

      {/* Scoreboard - Left / Right */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl shadow-lg p-8" style={{ backgroundColor: '#1a1a3e' }}>
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#DDFD51' }}>Left</h3>
              <div className="text-sm" style={{ color: '#9a9ab8' }}>
                Sets: {scoreState?.setsLeft ?? 0}
              </div>
            </div>
            <div className="text-8xl font-bold text-center mb-6" style={{ color: '#DDFD51' }}>
              {scoreState?.leftScore ?? 0}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleScoreChange('left', 'increment')}
                className="flex-1 font-bold py-6 px-4 rounded-lg text-2xl transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                +
              </button>
              <button
                onClick={() => handleScoreChange('left', 'decrement')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-6 px-4 rounded-lg text-2xl transition-colors"
              >
                −
              </button>
            </div>
          </div>

          <div className="rounded-xl shadow-lg p-8" style={{ backgroundColor: '#1a1a3e' }}>
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#DDFD51' }}>Right</h3>
              <div className="text-sm" style={{ color: '#9a9ab8' }}>
                Sets: {scoreState?.setsRight ?? 0}
              </div>
            </div>
            <div className="text-8xl font-bold text-center mb-6" style={{ color: '#DDFD51' }}>
              {scoreState?.rightScore ?? 0}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleScoreChange('right', 'increment')}
                className="flex-1 font-bold py-6 px-4 rounded-lg text-2xl transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                +
              </button>
              <button
                onClick={() => handleScoreChange('right', 'decrement')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-6 px-4 rounded-lg text-2xl transition-colors"
              >
                −
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mb-6">
        <button
          onClick={handleResetSet}
          className="w-full bg-yellow-500 hover:bg-yellow-600 font-bold py-4 px-6 rounded-lg transition-colors"
          style={{ color: '#000429' }}
        >
          Reset Set
        </button>
      </div>

      {/* Bottom Bar - Tournament Label */}
      <div className="fixed bottom-0 left-0 right-0 py-4 text-center font-bold text-xl" style={{ backgroundColor: '#DDFD51', color: '#000429' }}>
        {tournamentLabel} Court {courts.find(c => c.id === selectedCourt)?.court_number ?? selectedCourt}
      </div>
    </div>
  );
}

export default ControlUI;

