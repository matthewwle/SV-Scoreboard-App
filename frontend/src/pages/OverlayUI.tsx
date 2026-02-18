import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { API_URL } from '../config';
import { Court } from '../types';

function OverlayUI() {
  const { courtId, tid, courtNum } = useParams<{ courtId?: string; tid?: string; courtNum?: string }>();

  const isNewRoute = !!tid && !!courtNum;
  const tournamentId = tid ? parseInt(tid) : null;
  const courtNumber = courtNum ? parseInt(courtNum) : null;
  const legacyCourtId = courtId ? parseInt(courtId) : null;

  const [actualCourtId, setActualCourtId] = useState<number | null>(null);
  const [courtDisplayNumber, setCourtDisplayNumber] = useState<number | null>(null);
  const [tournamentLabel, setTournamentLabel] = useState('');

  const { scoreState } = useSocket(actualCourtId);

  useEffect(() => {
    async function resolveCourt() {
      if (isNewRoute && tournamentId && courtNumber) {
        try {
          const response = await fetch(`${API_URL}/api/tournaments/${tournamentId}/courts`);
          if (response.ok) {
            const courts: Court[] = await response.json();
            const court = courts.find((c) => c.court_number === courtNumber);
            if (court) {
              setActualCourtId(court.id);
              setCourtDisplayNumber(court.court_number);
              const labelResponse = await fetch(`${API_URL}/api/tournaments/${tournamentId}/label`);
              if (labelResponse.ok) {
                const labelData = await labelResponse.json();
                setTournamentLabel(labelData.label || '');
              }
            }
          }
        } catch (error) {
          console.error('Error resolving court:', error);
        }
      } else if (legacyCourtId) {
        setActualCourtId(legacyCourtId);
        try {
          const courtResponse = await fetch(`${API_URL}/api/court/${legacyCourtId}`);
          if (courtResponse.ok) {
            const court: Court = await courtResponse.json();
            setCourtDisplayNumber(court.court_number);
            const labelResponse = await fetch(`${API_URL}/api/tournaments/${court.tournament_id}/label`);
            if (labelResponse.ok) {
              const labelData = await labelResponse.json();
              setTournamentLabel(labelData.label || '');
            }
          }
        } catch (error) {
          console.error('Error fetching court info:', error);
        }
      }
    }
    resolveCourt();
  }, [isNewRoute, tournamentId, courtNumber, legacyCourtId]);

  // Swapped for camera view: score-table Left appears on RIGHT of overlay, Right on LEFT
  const leftScore = scoreState?.leftScore ?? 0;
  const rightScore = scoreState?.rightScore ?? 0;
  const setHistory = scoreState?.setHistory ?? [];

  return (
    <div style={{ transform: 'scale(0.36)', transformOrigin: 'top left', width: '278vw', height: '278vh' }}>
      <div className="min-h-screen flex items-start justify-start p-8" style={{ backgroundColor: 'transparent' }}>
        <div className="w-full max-w-5xl">
          <div className="rounded-lg overflow-hidden shadow-2xl" style={{ backgroundColor: '#000429' }}>
            <div className="flex items-center px-6 py-4">
              <div className="flex-shrink-0 mr-8">
                <div className="text-4xl font-black" style={{ color: '#DDFD51' }}>
                  AIM+
                </div>
              </div>

              <div className="flex-1">
                {/* Right (score table) = first row on overlay (camera left) */}
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xl font-bold truncate mr-4" style={{ color: 'white', maxWidth: '300px' }}>
                    Right
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold" style={{ color: 'white' }}>
                      {rightScore}
                    </div>
                    <div className="flex gap-2">
                      {Array.from({ length: 3 }).map((_, i) => {
                        const setScore = setHistory[i];
                        const isWon = setScore !== undefined;
                        return (
                          <div
                            key={i}
                            className="w-12 h-10 rounded flex items-center justify-center font-bold text-sm"
                            style={{
                              backgroundColor: isWon ? '#DDFD51' : '#1a1a3e',
                              color: isWon ? '#000429' : '#666',
                            }}
                          >
                            {isWon ? `${setScore.rightScore}` : '-'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Left (score table) = second row on overlay (camera right) */}
                <div className="flex items-center justify-between">
                  <div className="text-xl font-bold truncate mr-4" style={{ color: 'white', maxWidth: '300px' }}>
                    Left
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl font-bold" style={{ color: 'white' }}>
                      {leftScore}
                    </div>
                    <div className="flex gap-2">
                      {Array.from({ length: 3 }).map((_, i) => {
                        const setScore = setHistory[i];
                        const isWon = setScore !== undefined;
                        return (
                          <div
                            key={i}
                            className="w-12 h-10 rounded flex items-center justify-center font-bold text-sm"
                            style={{
                              backgroundColor: isWon ? '#DDFD51' : '#1a1a3e',
                              color: isWon ? '#000429' : '#666',
                            }}
                          >
                            {isWon ? `${setScore.leftScore}` : '-'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="py-2 px-6 text-center font-bold text-lg" style={{ backgroundColor: '#DDFD51', color: '#000429' }}>
              {tournamentLabel} - Court {courtDisplayNumber || actualCourtId || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverlayUI;
