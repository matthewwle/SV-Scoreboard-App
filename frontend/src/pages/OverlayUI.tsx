import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { API_URL } from '../config';
import { Match } from '../types';

function OverlayUI() {
  const { courtId } = useParams<{ courtId: string }>();
  const courtIdNum = courtId ? parseInt(courtId) : null;
  const { scoreState } = useSocket(courtIdNum);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);

  useEffect(() => {
    if (!courtIdNum) return;

    async function loadMatch() {
      try {
        const response = await fetch(`${API_URL}/api/court/${courtIdNum}/currentMatch`);
        if (response.ok) {
          const match = await response.json();
          setCurrentMatch(match);
        }
      } catch (error) {
        console.error('Error loading match:', error);
      }
    }

    loadMatch();
  }, [courtIdNum]);

  return (
    <div className="min-h-screen flex items-start justify-center p-8" style={{ backgroundColor: 'transparent' }}>
      <div className="w-full max-w-5xl">
        {/* Compact Horizontal Scoreboard */}
        <div className="rounded-lg overflow-hidden shadow-2xl" style={{ backgroundColor: '#000429' }}>
          <div className="flex items-center px-6 py-4">
            {/* Logo/Brand */}
            <div className="flex-shrink-0 mr-8">
              <div className="text-4xl font-black" style={{ color: '#DDFD51' }}>
                AIM+
              </div>
            </div>

            {/* Teams Section */}
            <div className="flex-1">
              {/* Team A */}
              <div className="flex items-center justify-between mb-2">
                <div className="text-xl font-bold truncate mr-4" style={{ color: 'white', maxWidth: '300px' }}>
                  {scoreState?.teamA || currentMatch?.team_a || 'Team A'}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold" style={{ color: 'white' }}>
                    {scoreState?.teamAScore || 0}
                  </div>
                  <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => {
                      const setScore = scoreState?.setHistory?.[i];
                      const isWon = setScore !== undefined;
                      
                      return (
                        <div 
                          key={i} 
                          className="w-12 h-10 rounded flex items-center justify-center font-bold text-sm"
                          style={{ 
                            backgroundColor: isWon ? '#DDFD51' : '#1a1a3e',
                            color: isWon ? '#000429' : '#666'
                          }}
                        >
                          {isWon ? `${setScore.teamAScore}` : '-'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Team B */}
              <div className="flex items-center justify-between">
                <div className="text-xl font-bold truncate mr-4" style={{ color: 'white', maxWidth: '300px' }}>
                  {scoreState?.teamB || currentMatch?.team_b || 'Team B'}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold" style={{ color: 'white' }}>
                    {scoreState?.teamBScore || 0}
                  </div>
                  <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, i) => {
                      const setScore = scoreState?.setHistory?.[i];
                      const isWon = setScore !== undefined;
                      
                      return (
                        <div 
                          key={i} 
                          className="w-12 h-10 rounded flex items-center justify-center font-bold text-sm"
                          style={{ 
                            backgroundColor: isWon ? '#DDFD51' : '#1a1a3e',
                            color: isWon ? '#000429' : '#666'
                          }}
                        >
                          {isWon ? `${setScore.teamBScore}` : '-'}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar - Winter Formal */}
          <div className="py-2 px-6 text-center font-bold text-lg" style={{ backgroundColor: '#DDFD51', color: '#000429' }}>
            Winter Formal - Court {courtIdNum}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OverlayUI;

