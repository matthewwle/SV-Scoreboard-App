import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { useSocket } from '../hooks/useSocket';
import { Court, Match } from '../types';

function ControlUI() {
  const [selectedCourt, setSelectedCourt] = useState<number | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showCourtSelect, setShowCourtSelect] = useState(true);
  const [showPauseScreen, setShowPauseScreen] = useState(false);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [showSetWinModal, setShowSetWinModal] = useState(false);

  const { scoreState, isConnected } = useSocket(selectedCourt);

  // Check if current match is complete
  const isMatchComplete = currentMatch?.is_completed || 
    (scoreState && (scoreState.setsA >= 2 || scoreState.setsB >= 2));

  // Show modal when a set is won
  useEffect(() => {
    if (scoreState?.pendingSetWin && !showSetWinModal) {
      setShowSetWinModal(true);
    } else if (!scoreState?.pendingSetWin && showSetWinModal) {
      setShowSetWinModal(false);
    }
  }, [scoreState?.pendingSetWin]);

  // Load court selection from localStorage
  useEffect(() => {
    const savedCourt = localStorage.getItem('courtId');
    if (savedCourt) {
      const courtId = parseInt(savedCourt);
      setSelectedCourt(courtId);
      setShowCourtSelect(false);
      loadCurrentMatch(courtId);
      loadUpcomingMatches(courtId);
    }
  }, []);

  // Show pause screen when match is complete
  useEffect(() => {
    if (isMatchComplete && !showPauseScreen) {
      setShowPauseScreen(true);
    }
  }, [isMatchComplete]);

  // Fetch all courts
  useEffect(() => {
    fetchCourts();
  }, []);

  async function fetchCourts() {
    try {
      const response = await fetch(`${API_URL}/api/courts`);
      const data = await response.json();
      setCourts(data);
    } catch (error) {
      console.error('Error fetching courts:', error);
    }
  }

  async function loadCurrentMatch(courtId: number) {
    try {
      const response = await fetch(`${API_URL}/api/court/${courtId}/currentMatch`);
      if (response.ok) {
        const match = await response.json();
        setCurrentMatch(match);
      }
    } catch (error) {
      console.error('Error loading current match:', error);
    }
  }

  async function loadUpcomingMatches(courtId: number) {
    try {
      const response = await fetch(`${API_URL}/api/court/${courtId}/upcomingMatches?limit=3`);
      if (response.ok) {
        const matches = await response.json();
        setUpcomingMatches(matches);
      }
    } catch (error) {
      console.error('Error loading upcoming matches:', error);
    }
  }

  async function advanceToNextMatch() {
    if (!selectedCourt) return;
    
    try {
      const response = await fetch(`${API_URL}/api/court/${selectedCourt}/advanceToNextMatch`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const nextMatch = await response.json();
        setCurrentMatch(nextMatch);
        setShowPauseScreen(false);
        loadUpcomingMatches(selectedCourt);
        
        // Force reload the current match to get fresh data
        setTimeout(() => {
          loadCurrentMatch(selectedCourt);
        }, 500);
      } else {
        alert('No more matches available for this court');
      }
    } catch (error) {
      console.error('Error advancing to next match:', error);
      alert('Error advancing to next match');
    }
  }

  function handleCourtSelect(courtId: number) {
    localStorage.setItem('courtId', courtId.toString());
    setSelectedCourt(courtId);
    setShowCourtSelect(false);
    loadCurrentMatch(courtId);
    loadUpcomingMatches(courtId);
  }

  function handleLogoTap() {
    const newTaps = logoTaps + 1;
    setLogoTaps(newTaps);
    
    if (newTaps >= 5) {
      // Reset court selection
      localStorage.removeItem('courtId');
      setSelectedCourt(null);
      setCurrentMatch(null);
      setShowCourtSelect(true);
      setLogoTaps(0);
      alert('Court selection reset!');
    }
    
    // Reset tap count after 2 seconds
    setTimeout(() => setLogoTaps(0), 2000);
  }

  async function handleScoreChange(team: 'A' | 'B', action: 'increment' | 'decrement') {
    if (!selectedCourt) return;

    try {
      await fetch(`${API_URL}/api/score/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt, team })
      });
    } catch (error) {
      console.error('Error updating score:', error);
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

  async function handleSwapSides() {
    if (!selectedCourt) return;
    if (!confirm('Swap team sides?')) return;

    try {
      await fetch(`${API_URL}/api/score/swapSides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt })
      });
      // Reload match data
      loadCurrentMatch(selectedCourt);
    } catch (error) {
      console.error('Error swapping sides:', error);
    }
  }

  async function handleConfirmSetWin() {
    if (!selectedCourt) return;

    try {
      await fetch(`${API_URL}/api/score/confirmSetWin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt })
      });
      setShowSetWinModal(false);
    } catch (error) {
      console.error('Error confirming set win:', error);
    }
  }

  async function handleUndoSetWin() {
    if (!selectedCourt || !scoreState?.pendingSetWin) return;

    // Undo the last point by decrementing the winning team's score
    try {
      await fetch(`${API_URL}/api/score/decrement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId: selectedCourt, team: scoreState.pendingSetWin })
      });
      setShowSetWinModal(false);
    } catch (error) {
      console.error('Error undoing set win:', error);
    }
  }

  if (showCourtSelect) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#000429' }}>
        <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full" style={{ backgroundColor: '#1a1a3e' }}>
          <h1 className="text-3xl font-bold text-center mb-6" style={{ color: '#DDFD51' }}>
            Select Court
          </h1>
          <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {courts.map((court) => (
              <button
                key={court.id}
                onClick={() => handleCourtSelect(court.id)}
                className="font-bold py-4 px-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                {court.id}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Pause screen - shown when match is complete
  if (showPauseScreen) {
    const nextTwoMatches = upcomingMatches.slice(0, 2);
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#000429' }}>
        <div className="rounded-2xl shadow-2xl p-8 max-w-2xl w-full" style={{ backgroundColor: '#1a1a3e' }}>
          <h1 className="text-4xl font-bold text-center mb-4" style={{ color: '#DDFD51' }}>
            Match Complete! 🎉
          </h1>
          
          <div className="text-center mb-8">
            <div className="text-2xl font-semibold mb-2" style={{ color: 'white' }}>
              {scoreState?.teamA} vs {scoreState?.teamB}
            </div>
            <div className="text-xl" style={{ color: '#9a9ab8' }}>
              Final Score: {scoreState?.setsA} - {scoreState?.setsB}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-center" style={{ color: '#DDFD51' }}>
              Next Games
            </h2>
            
            {nextTwoMatches.length > 0 ? (
              <div className="space-y-4">
                {nextTwoMatches.map((match, index) => (
                  <div 
                    key={match.id}
                    className="rounded-xl p-6"
                    style={{ 
                      backgroundColor: index === 0 ? '#2a2a4e' : '#1a1a3e',
                      border: index === 0 ? '2px solid #DDFD51' : 'none'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold" style={{ color: 'white' }}>
                        {match.team_a}
                      </div>
                      <div className="text-sm font-bold" style={{ color: '#DDFD51' }}>
                        vs
                      </div>
                      <div className="text-lg font-semibold" style={{ color: 'white' }}>
                        {match.team_b}
                      </div>
                    </div>
                    {index === 0 && (
                      <div className="text-center mt-2 text-sm" style={{ color: '#DDFD51' }}>
                        ⬆ Next Up
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-lg" style={{ color: '#9a9ab8' }}>
                No upcoming matches scheduled
              </div>
            )}
          </div>

          <button
            onClick={advanceToNextMatch}
            disabled={nextTwoMatches.length === 0}
            className="w-full font-bold py-6 px-6 rounded-xl text-2xl transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#DDFD51', color: '#000429' }}
          >
            Start Scoring Next Match
          </button>
        </div>

        {/* Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 py-4 text-center font-bold text-xl" style={{ backgroundColor: '#DDFD51', color: '#000429' }}>
          Winter Formal Court {selectedCourt}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: '#000429' }}>
      {/* Set Win Confirmation Modal */}
      {showSetWinModal && scoreState?.pendingSetWin && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full" style={{ backgroundColor: '#1a1a3e' }}>
            <h2 className="text-3xl font-bold text-center mb-4" style={{ color: '#DDFD51' }}>
              Set Won! 🎉
            </h2>
            <div className="text-center mb-8">
              <div className="text-2xl font-semibold mb-2" style={{ color: 'white' }}>
                {scoreState.pendingSetWin === 'A' ? scoreState.teamA : scoreState.teamB}
              </div>
              <div className="text-xl" style={{ color: '#9a9ab8' }}>
                wins Set {scoreState.setNumber}
              </div>
              <div className="text-4xl font-bold mt-4" style={{ color: '#DDFD51' }}>
                {scoreState.teamAScore} - {scoreState.teamBScore}
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
              Court {selectedCourt}
            </div>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Match Info */}
      {currentMatch && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="rounded-xl shadow-lg p-6" style={{ backgroundColor: '#1a1a3e' }}>
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#DDFD51' }}>
                Set {scoreState?.setNumber || 1}
              </h2>
              <div className="text-sm" style={{ color: '#9a9ab8' }}>
                Best of 3 • First to 25 (win by 2)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Team A */}
          <div className="rounded-xl shadow-lg p-8" style={{ backgroundColor: '#1a1a3e' }}>
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#DDFD51' }}>
                {scoreState?.teamA || currentMatch?.team_a || 'Team A'}
              </h3>
              <div className="text-sm" style={{ color: '#9a9ab8' }}>
                Sets: {scoreState?.setsA || 0}
              </div>
            </div>
            <div className="text-8xl font-bold text-center mb-6" style={{ color: '#DDFD51' }}>
              {scoreState?.teamAScore || 0}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleScoreChange('A', 'increment')}
                className="flex-1 font-bold py-6 px-4 rounded-lg text-2xl transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                +
              </button>
              <button
                onClick={() => handleScoreChange('A', 'decrement')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-6 px-4 rounded-lg text-2xl transition-colors"
              >
                −
              </button>
            </div>
          </div>

          {/* Team B */}
          <div className="rounded-xl shadow-lg p-8" style={{ backgroundColor: '#1a1a3e' }}>
            <div className="text-center mb-4">
              <h3 className="text-2xl font-bold mb-2" style={{ color: '#DDFD51' }}>
                {scoreState?.teamB || currentMatch?.team_b || 'Team B'}
              </h3>
              <div className="text-sm" style={{ color: '#9a9ab8' }}>
                Sets: {scoreState?.setsB || 0}
              </div>
            </div>
            <div className="text-8xl font-bold text-center mb-6" style={{ color: '#DDFD51' }}>
              {scoreState?.teamBScore || 0}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => handleScoreChange('B', 'increment')}
                className="flex-1 font-bold py-6 px-4 rounded-lg text-2xl transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                +
              </button>
              <button
                onClick={() => handleScoreChange('B', 'decrement')}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-6 px-4 rounded-lg text-2xl transition-colors"
              >
                −
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleResetSet}
            className="bg-yellow-500 hover:bg-yellow-600 font-bold py-4 px-6 rounded-lg transition-colors"
            style={{ color: '#000429' }}
          >
            Reset Set
          </button>
          <button
            onClick={handleSwapSides}
            className="font-bold py-4 px-6 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#DDFD51', color: '#000429' }}
          >
            Swap Sides
          </button>
        </div>
      </div>

      {/* Bottom Bar - Winter Formal */}
      <div className="fixed bottom-0 left-0 right-0 py-4 text-center font-bold text-xl" style={{ backgroundColor: '#DDFD51', color: '#000429' }}>
        Winter Formal Court {selectedCourt}
      </div>
    </div>
  );
}

export default ControlUI;

