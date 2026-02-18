import { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Tournament } from '../types';

function AdminUI() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<number | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [showTournamentManager, setShowTournamentManager] = useState(false);
  const [showCreateTournament, setShowCreateTournament] = useState(false);
  const [newTournamentLabel, setNewTournamentLabel] = useState('');
  const [newTournamentCourtCount, setNewTournamentCourtCount] = useState('20');
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [editingTournamentId, setEditingTournamentId] = useState<number | null>(null);
  const [editTournamentLabel, setEditTournamentLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [tournamentLabel, setTournamentLabel] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [labelSuccess, setLabelSuccess] = useState<string | null>(null);

  // Load tournaments on mount
  useEffect(() => {
    loadTournaments();
  }, []);

  // Load selected tournament details when selection changes
  useEffect(() => {
    if (selectedTournamentId) {
      loadTournamentDetails(selectedTournamentId);
      // Save to localStorage
      localStorage.setItem('adminSelectedTournamentId', String(selectedTournamentId));
    } else {
      // Try to load from localStorage
      const savedId = localStorage.getItem('adminSelectedTournamentId');
      if (savedId) {
        const id = parseInt(savedId);
        if (!isNaN(id)) {
          setSelectedTournamentId(id);
        }
      }
    }
  }, [selectedTournamentId]);

  async function loadTournaments() {
    setLoadingTournaments(true);
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
    } catch (err) {
      console.error('Failed to load tournaments:', err);
    } finally {
      setLoadingTournaments(false);
    }
  }

  async function loadTournamentDetails(tournamentId: number) {
    try {
      const response = await fetch(`${API_URL}/api/tournaments/${tournamentId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTournament(data);
        // Load tournament-specific settings
        const labelResponse = await fetch(`${API_URL}/api/tournaments/${tournamentId}/label`);
        if (labelResponse.ok) {
          const labelData = await labelResponse.json();
          setTournamentLabel(labelData.label || '');
        }
      }
    } catch (err) {
      console.error('Failed to load tournament details:', err);
    }
  }

  async function createTournament() {
    if (!newTournamentLabel.trim() || !newTournamentCourtCount) {
      setError('Label and court count are required');
      return;
    }
    const courtCount = parseInt(newTournamentCourtCount);
    if (isNaN(courtCount) || courtCount < 1 || courtCount > 100) {
      setError('Court count must be between 1 and 100');
      return;
    }
    setCreatingTournament(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/tournaments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newTournamentLabel.trim(),
          courtCount,
        })
      });
      if (response.ok) {
        const data = await response.json();
        await loadTournaments();
        setSelectedTournamentId(data.tournament.id);
        setShowCreateTournament(false);
        setNewTournamentLabel('');
        setNewTournamentCourtCount('20');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create tournament');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    } finally {
      setCreatingTournament(false);
    }
  }

  async function updateTournament(tournamentId: number) {
    try {
      const updates: Record<string, string> = {};
      if (editTournamentLabel.trim()) updates.label = editTournamentLabel.trim();
      const response = await fetch(`${API_URL}/api/tournaments/${tournamentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        await loadTournaments();
        await loadTournamentDetails(tournamentId);
        setEditingTournamentId(null);
        setEditTournamentLabel('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update tournament');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tournament');
    }
  }

  async function deleteTournament(tournamentId: number) {
    if (!confirm('Are you sure you want to delete this tournament? This will delete all courts, matches, and related data.')) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/tournaments/${tournamentId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await loadTournaments();
        if (selectedTournamentId === tournamentId) {
          setSelectedTournamentId(null);
          setSelectedTournament(null);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete tournament');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tournament');
    }
  }

  async function loadTournamentLabel() {
    if (!selectedTournamentId) return;
    try {
      const response = await fetch(`${API_URL}/api/tournaments/${selectedTournamentId}/label`);
      if (response.ok) {
        const data = await response.json();
        setTournamentLabel(data.label || '');
        setLabelInput(data.label || '');
      }
    } catch (err) {
      console.error('Failed to load tournament label:', err);
    }
  }

  // Save tournament label to API
  async function saveTournamentLabel() {
    if (!selectedTournamentId) {
      setLabelSuccess('Please select a tournament first');
      return;
    }
    setSavingLabel(true);
    setLabelSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/tournaments/${selectedTournamentId}/label`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labelInput })
      });

      if (!response.ok) {
        throw new Error('Failed to save label');
      }

      setTournamentLabel(labelInput);
      setLabelSuccess('✅ Tournament label saved!');
      await loadTournamentDetails(selectedTournamentId);
      
      // Close modal after 1.5 seconds
      setTimeout(() => {
        setShowLabelEditor(false);
        setLabelSuccess(null);
      }, 1500);
    } catch (err) {
      console.error('Failed to save tournament label:', err);
    } finally {
      setSavingLabel(false);
    }
  }

  // Handle opening label editor
  function handleOpenLabelEditor() {
    if (!selectedTournamentId) {
      alert('Please select a tournament first');
      return;
    }
    loadTournamentLabel();
    setLabelInput(tournamentLabel);
    setShowLabelEditor(true);
    setLabelSuccess(null);
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#000429' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="rounded-xl shadow-lg p-6 mb-6" style={{ backgroundColor: '#1a1a3e' }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ color: '#DDFD51' }}>Admin Dashboard</h1>
              <p className="mt-2" style={{ color: '#9a9ab8' }}>Manage tournaments and court labels</p>
            </div>
            <button
              onClick={() => setShowTournamentManager(true)}
              className="font-bold py-2 px-4 rounded-lg transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#DDFD51', color: '#000429' }}
            >
              🏆 Manage Tournaments
            </button>
          </div>
          
          {/* Tournament Selector */}
          <div className="mt-4">
            <label className="block text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>
              Selected Tournament
            </label>
            {loadingTournaments ? (
              <div style={{ color: '#9a9ab8' }}>Loading tournaments...</div>
            ) : tournaments.length === 0 ? (
              <div style={{ color: '#9a9ab8' }}>
                No tournaments found. <button onClick={() => setShowCreateTournament(true)} className="underline">Create one</button>
              </div>
            ) : (
              <select
                value={selectedTournamentId || ''}
                onChange={(e) => setSelectedTournamentId(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2 rounded-lg font-semibold"
                style={{ 
                  backgroundColor: '#000429', 
                  color: '#ffffff',
                  border: '2px solid #DDFD51',
                  minWidth: '300px'
                }}
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.court_count} courts)
                  </option>
                ))}
              </select>
            )}
            {selectedTournament && (
              <div className="mt-2 text-sm" style={{ color: '#9a9ab8' }}>
                {selectedTournament.label} • {selectedTournament.court_count} courts
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl shadow-lg p-6 mb-6" style={{ backgroundColor: '#1a1a3e' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#DDFD51' }}>Quick Actions</h2>
          {!selectedTournamentId ? (
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#000429' }}>
              <p style={{ color: '#9a9ab8' }}>Please select a tournament above to edit its label.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleOpenLabelEditor}
                className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-80 flex items-center gap-2"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                🏷️ Edit Tournament Label
              </button>
              <div className="mt-3 w-full text-sm" style={{ color: '#9a9ab8' }}>
                Current label: <span style={{ color: '#DDFD51' }}>"{tournamentLabel}"</span>
              </div>
            </div>
          )}
        </div>

        {/* Tournament Manager Modal */}
        {showTournamentManager && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ backgroundColor: '#1a1a3e' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#DDFD51' }}>
                  🏆 Tournament Management
                </h2>
                <button
                  onClick={() => {
                    setShowTournamentManager(false);
                    setShowCreateTournament(false);
                    setEditingTournamentId(null);
                  }}
                  className="text-2xl hover:opacity-70 transition-opacity"
                  style={{ color: '#DDFD51' }}
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-900/50 border border-red-400 text-red-200 text-sm">
                  {error}
                </div>
              )}
              {/* Create Tournament Form */}
              {showCreateTournament && (
                <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#000429' }}>
                  <h3 className="text-lg font-bold mb-4" style={{ color: '#DDFD51' }}>Create New Tournament</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>
                        Tournament Label
                      </label>
                      <input
                        type="text"
                        value={newTournamentLabel}
                        onChange={(e) => setNewTournamentLabel(e.target.value)}
                        placeholder="e.g., Winter Formal 2024"
                        className="w-full px-4 py-2 rounded-lg"
                        style={{ backgroundColor: '#1a1a3e', color: '#ffffff', border: '2px solid #DDFD51' }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>
                        Number of Courts
                      </label>
                      <input
                        type="number"
                        value={newTournamentCourtCount}
                        onChange={(e) => setNewTournamentCourtCount(e.target.value)}
                        min="1"
                        max="100"
                        className="w-full px-4 py-2 rounded-lg"
                        style={{ backgroundColor: '#1a1a3e', color: '#ffffff', border: '2px solid #DDFD51' }}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={createTournament}
                        disabled={creatingTournament}
                        className="font-bold py-2 px-4 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                      >
                        {creatingTournament ? 'Creating...' : 'Create Tournament'}
                      </button>
                      <button
                        onClick={() => setShowCreateTournament(false)}
                        className="font-bold py-2 px-4 rounded-lg transition-opacity hover:opacity-80"
                        style={{ backgroundColor: '#9a9ab8', color: '#000429' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tournament List */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold" style={{ color: '#DDFD51' }}>Tournaments</h3>
                  {!showCreateTournament && (
                    <button
                      onClick={() => setShowCreateTournament(true)}
                      className="font-bold py-2 px-4 rounded-lg transition-opacity hover:opacity-80"
                      style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                    >
                      + New Tournament
                    </button>
                  )}
                </div>
                {tournaments.length === 0 ? (
                  <p style={{ color: '#9a9ab8' }}>No tournaments yet. Create one to get started!</p>
                ) : (
                  <div className="space-y-2">
                    {tournaments.map(tournament => (
                      <div key={tournament.id} className="p-4 rounded-lg" style={{ backgroundColor: '#000429' }}>
                        {editingTournamentId === tournament.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editTournamentLabel}
                              onChange={(e) => setEditTournamentLabel(e.target.value)}
                              className="w-full px-3 py-2 rounded-lg"
                              style={{ backgroundColor: '#1a1a3e', color: '#ffffff', border: '2px solid #DDFD51' }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateTournament(tournament.id)}
                                className="font-bold py-1 px-3 rounded-lg transition-opacity hover:opacity-80 text-sm"
                                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingTournamentId(null);
                                  setEditTournamentLabel('');
                                }}
                                className="font-bold py-1 px-3 rounded-lg transition-opacity hover:opacity-80 text-sm"
                                style={{ backgroundColor: '#9a9ab8', color: '#000429' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-bold" style={{ color: '#DDFD51' }}>
                                {tournament.label}
                                {selectedTournamentId === tournament.id && ' (Selected)'}
                              </div>
                              <div className="text-sm" style={{ color: '#9a9ab8' }}>
                                {tournament.court_count} courts
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingTournamentId(tournament.id);
                                  setEditTournamentLabel(tournament.label);
                                }}
                                className="font-bold py-1 px-3 rounded-lg transition-opacity hover:opacity-80 text-sm"
                                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteTournament(tournament.id)}
                                className="font-bold py-1 px-3 rounded-lg transition-opacity hover:opacity-80 text-sm"
                                style={{ backgroundColor: '#ff4444', color: '#ffffff' }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tournament Label Editor Modal */}
        {showLabelEditor && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full" style={{ backgroundColor: '#1a1a3e' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#DDFD51' }}>
                  🏷️ Edit Tournament Label
                </h2>
                <button
                  onClick={() => setShowLabelEditor(false)}
                  className="text-2xl hover:opacity-70 transition-opacity"
                  style={{ color: '#DDFD51' }}
                >
                  ✕
                </button>
              </div>

              <p className="text-sm mb-4" style={{ color: '#9a9ab8' }}>
                This label appears on all scoreboards and control interfaces
              </p>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>
                  Tournament Label
                </label>
                <input
                  type="text"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  placeholder="Enter tournament name..."
                  className="w-full px-4 py-3 rounded-lg text-lg"
                  style={{ 
                    backgroundColor: '#000429', 
                    color: '#ffffff',
                    border: '2px solid #DDFD51'
                  }}
                  autoFocus
                />
              </div>

              {labelSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4 text-center">
                  {labelSuccess}
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setShowLabelEditor(false)}
                  className="flex-1 py-3 px-6 rounded-lg font-bold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#2a2a4e', color: '#ffffff' }}
                >
                  Cancel
                </button>
                <button
                  onClick={saveTournamentLabel}
                  disabled={savingLabel || !labelInput.trim()}
                  className="flex-1 py-3 px-6 rounded-lg font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                >
                  {savingLabel ? 'Saving...' : 'Save Label'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUI;
