import { useState, useEffect } from 'react';
import { API_URL } from '../config';

interface MatchLog {
  id: number;
  court_id: number;
  match_id: number;
  team_a: string;
  team_b: string;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
}

interface CourtDevice {
  courtId: number;
  courtName: string;
  larixDeviceId: string | null;
  hasCurrentMatch: boolean;
}

interface ScheduleGame {
  id: number;
  time: string;
  teamA: string;
  teamB: string;
  externalMatchId: string | null;
  isCompleted: boolean;
  isCrossover: boolean;
}

interface Court {
  id: number;
  name: string;
}

function AdminUI() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [matchLogs, setMatchLogs] = useState<MatchLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  // Device assignment state
  const [showDeviceAssignment, setShowDeviceAssignment] = useState(false);
  const [courtDevices, setCourtDevices] = useState<CourtDevice[]>([]);
  const [deviceInputs, setDeviceInputs] = useState<{ [key: number]: string }>({});
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [savingDevice, setSavingDevice] = useState<number | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [deviceSuccess, setDeviceSuccess] = useState<string | null>(null);

  // Tournament label state
  const [showLabelEditor, setShowLabelEditor] = useState(false);
  const [tournamentLabel, setTournamentLabel] = useState('Winter Formal');
  const [labelInput, setLabelInput] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [labelSuccess, setLabelSuccess] = useState<string | null>(null);

  // Schedule Editor state
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [scheduleGames, setScheduleGames] = useState<ScheduleGame[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [editingGames, setEditingGames] = useState<{ [key: number]: { teamA: string; teamB: string } }>({});
  const [savingGameId, setSavingGameId] = useState<number | null>(null);
  const [deletingGameId, setDeletingGameId] = useState<number | null>(null);
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [newGameTeamA, setNewGameTeamA] = useState('');
  const [newGameTeamB, setNewGameTeamB] = useState('');
  const [addingGame, setAddingGame] = useState(false);
  const [togglingCrossoverId, setTogglingCrossoverId] = useState<number | null>(null);

  // SportWrench settings state
  const [showSportWrenchSettings, setShowSportWrenchSettings] = useState(false);
  const [sportWrenchEventId, setSportWrenchEventId] = useState<string>('');
  const [sportWrenchInput, setSportWrenchInput] = useState<string>('');
  const [savingSportWrench, setSavingSportWrench] = useState(false);
  const [sportWrenchSuccess, setSportWrenchSuccess] = useState<string | null>(null);
  const [sportWrenchError, setSportWrenchError] = useState<string | null>(null);
  const [syncingSportWrench, setSyncingSportWrench] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<string | null>(null);

  // SportWrench import state
  const [importing, setImporting] = useState(false);
  const [importCourtMin, setImportCourtMin] = useState<string>('1');
  const [importCourtMax, setImportCourtMax] = useState<string>('70');
  const [importResult, setImportResult] = useState<string | null>(null);

  // Crossover CSV upload state
  const [crossoverFile, setCrossoverFile] = useState<File | null>(null);
  const [uploadingCrossover, setUploadingCrossover] = useState(false);
  const [crossoverResult, setCrossoverResult] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    // Load tournament label
    async function loadSettings() {
      try {
        // Load tournament label
        const labelResponse = await fetch(`${API_URL}/api/settings/tournamentLabel`);
        if (labelResponse.ok) {
          const data = await labelResponse.json();
          setTournamentLabel(data.label || 'Winter Formal');
        }
        
        // Load SportWrench Event ID
        const swResponse = await fetch(`${API_URL}/api/settings/sportwrenchEventId`);
        if (swResponse.ok) {
          const data = await swResponse.json();
          setSportWrenchEventId(data.eventId || '');
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, []);

  async function handleUpload() {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/api/admin/uploadSchedule`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function loadMatchLogs() {
    setLoadingLogs(true);
    setLogsError(null);

    try {
      const response = await fetch(`${API_URL}/api/logs/matches`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch match logs');
      }

      const data = await response.json();
      setMatchLogs(data);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoadingLogs(false);
    }
  }

  function exportLogsToCSV() {
    if (matchLogs.length === 0) {
      alert('No logs to export');
      return;
    }

    // Create CSV content
    const headers = ['Court', 'Match ID', 'Team A', 'Team B', 'Start Time', 'End Time'];
    const rows = matchLogs.map(log => [
      log.court_id,
      log.match_id,
      log.team_a,
      log.team_b,
      log.start_time ? new Date(log.start_time).toLocaleString() : 'N/A',
      log.end_time ? new Date(log.end_time).toLocaleString() : 'In Progress'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `match-logs-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  // Load court devices from API
  async function loadCourtDevices() {
    setLoadingDevices(true);
    setDeviceError(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/courts/larixDevices`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch court devices');
      }

      const data: CourtDevice[] = await response.json();
      setCourtDevices(data);
      
      // Initialize input values with current device IDs
      const inputs: { [key: number]: string } = {};
      data.forEach(court => {
        inputs[court.courtId] = court.larixDeviceId || '';
      });
      setDeviceInputs(inputs);
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : 'Failed to load devices');
    } finally {
      setLoadingDevices(false);
    }
  }

  // Save device ID for a specific court
  async function saveDeviceId(courtId: number) {
    const deviceId = deviceInputs[courtId]?.trim();
    
    if (!deviceId) {
      setDeviceError(`Please enter a device ID for Court ${courtId}`);
      return;
    }

    setSavingDevice(courtId);
    setDeviceError(null);
    setDeviceSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/court/${courtId}/larixDevice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId })
      });

      if (!response.ok) {
        throw new Error('Failed to save device ID');
      }

      await response.json();
      setDeviceSuccess(`✅ Court ${courtId} assigned to device: ${deviceId}`);
      
      // Update local state
      setCourtDevices(prev => 
        prev.map(court => 
          court.courtId === courtId 
            ? { ...court, larixDeviceId: deviceId }
            : court
        )
      );

      // Clear success message after 3 seconds
      setTimeout(() => setDeviceSuccess(null), 3000);
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : 'Failed to save device ID');
    } finally {
      setSavingDevice(null);
    }
  }

  // Delete/clear device ID for a specific court
  const [deletingDevice, setDeletingDevice] = useState<number | null>(null);
  
  async function deleteDeviceId(courtId: number) {
    if (!confirm(`Remove device ID from Court ${courtId}?`)) {
      return;
    }

    setDeletingDevice(courtId);
    setDeviceError(null);
    setDeviceSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/admin/court/${courtId}/larixDevice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: '' })  // Empty string to clear
      });

      if (!response.ok) {
        throw new Error('Failed to remove device ID');
      }

      setDeviceSuccess(`✅ Device ID removed from Court ${courtId}`);
      
      // Update local state
      setCourtDevices(prev => 
        prev.map(court => 
          court.courtId === courtId 
            ? { ...court, larixDeviceId: null }
            : court
        )
      );
      
      // Clear the input field
      setDeviceInputs(prev => ({
        ...prev,
        [courtId]: ''
      }));

      setTimeout(() => setDeviceSuccess(null), 3000);
    } catch (err) {
      setDeviceError(err instanceof Error ? err.message : 'Failed to remove device ID');
    } finally {
      setDeletingDevice(null);
    }
  }

  // Handle opening device assignment panel
  function handleOpenDeviceAssignment() {
    setShowDeviceAssignment(true);
    loadCourtDevices();
  }

  // Load tournament label from API
  async function loadTournamentLabel() {
    try {
      const response = await fetch(`${API_URL}/api/settings/tournamentLabel`);
      if (response.ok) {
        const data = await response.json();
        setTournamentLabel(data.label || 'Winter Formal');
      }
    } catch (err) {
      console.error('Failed to load tournament label:', err);
    }
  }

  // Save tournament label to API
  async function saveTournamentLabel() {
    setSavingLabel(true);
    setLabelSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/settings/tournamentLabel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: labelInput })
      });

      if (!response.ok) {
        throw new Error('Failed to save label');
      }

      setTournamentLabel(labelInput);
      setLabelSuccess('✅ Tournament label saved!');
      
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
    loadTournamentLabel();
    setLabelInput(tournamentLabel);
    setShowLabelEditor(true);
    setLabelSuccess(null);
  }

  // ==========================================
  // SPORTWRENCH FUNCTIONS
  // ==========================================

  // Load SportWrench Event ID from API
  async function loadSportWrenchEventId() {
    try {
      const response = await fetch(`${API_URL}/api/settings/sportwrenchEventId`);
      if (response.ok) {
        const data = await response.json();
        setSportWrenchEventId(data.eventId || '');
        setSportWrenchInput(data.eventId || '');
      }
    } catch (err) {
      console.error('Failed to load SportWrench Event ID:', err);
    }
  }

  // Save SportWrench Event ID
  async function saveSportWrenchEventId() {
    setSavingSportWrench(true);
    setSportWrenchSuccess(null);
    setSportWrenchError(null);

    try {
      const response = await fetch(`${API_URL}/api/settings/sportwrenchEventId`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: sportWrenchInput.trim() })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setSportWrenchEventId(sportWrenchInput.trim());
      setSportWrenchSuccess(data.message || '✅ Event ID saved!');
      
      setTimeout(() => setSportWrenchSuccess(null), 5000);
    } catch (err) {
      setSportWrenchError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingSportWrench(false);
    }
  }

  // Manually trigger SportWrench sync
  async function triggerSportWrenchSync() {
    setSyncingSportWrench(true);
    setLastSyncResult(null);
    setSportWrenchError(null);

    try {
      const response = await fetch(`${API_URL}/api/settings/sportwrenchSync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setLastSyncResult(
        data.matchesUpdated > 0 
          ? `✅ Updated ${data.matchesUpdated} match${data.matchesUpdated > 1 ? 'es' : ''}`
          : '✅ No changes detected'
      );
      
      setTimeout(() => setLastSyncResult(null), 5000);
    } catch (err) {
      setSportWrenchError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingSportWrench(false);
    }
  }

  // Handle opening SportWrench settings
  function handleOpenSportWrenchSettings() {
    loadSportWrenchEventId();
    setShowSportWrenchSettings(true);
    setSportWrenchSuccess(null);
    setSportWrenchError(null);
    setLastSyncResult(null);
    setImportResult(null);
    setCrossoverResult(null);
  }

  // Import matches from SportWrench
  async function importFromSportWrench() {
    if (!sportWrenchEventId) {
      setSportWrenchError('Please save an Event ID first (click Save button after entering the ID)');
      return;
    }

    // Check if input differs from saved value
    if (sportWrenchInput && sportWrenchInput !== sportWrenchEventId) {
      setSportWrenchError(`You entered "${sportWrenchInput}" but haven't saved it. Currently saved: "${sportWrenchEventId}". Click Save first!`);
      return;
    }

    setImporting(true);
    setImportResult(null);
    setSportWrenchError(null);

    console.log(`Importing from Event ID: ${sportWrenchEventId}, Courts: ${importCourtMin}-${importCourtMax}`);

    try {
      const response = await fetch(`${API_URL}/api/schedule/import-from-sportwrench`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: sportWrenchEventId,
          courtMin: importCourtMin,
          courtMax: importCourtMax
        })
      });

      const data = await response.json();

      if (data.success) {
        const dayInfo = data.dayStats 
          ? ` (${Object.entries(data.dayStats).map(([day, count]) => `Day ${day}: ${count}`).join(', ')})`
          : '';
        setImportResult(`✅ ${data.message}${dayInfo}`);
      } else {
        setSportWrenchError(data.error || 'Import failed');
      }
    } catch (err) {
      setSportWrenchError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  // Upload crossover CSV mapping
  async function uploadCrossoverMapping() {
    if (!crossoverFile) {
      setSportWrenchError('Please select a CSV file');
      return;
    }

    setUploadingCrossover(true);
    setCrossoverResult(null);
    setSportWrenchError(null);

    try {
      const text = await crossoverFile.text();
      const lines = text.trim().split('\n');
      
      // Parse CSV (MatchID,IsCrossover)
      const mappings: Array<{ matchId: string; isCrossover: boolean }> = [];
      
      // Skip header if present
      const startIndex = lines[0].toLowerCase().includes('matchid') ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length >= 2) {
          const matchId = parts[0].trim();
          const isCrossover = parts[1].trim().toLowerCase() === 'true' || parts[1].trim() === '1';
          mappings.push({ matchId, isCrossover });
        }
      }

      if (mappings.length === 0) {
        setSportWrenchError('No valid mappings found in CSV');
        return;
      }

      const response = await fetch(`${API_URL}/api/schedule/upload-crossover-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings })
      });

      const data = await response.json();

      if (data.success) {
        setCrossoverResult(`✅ ${data.message}`);
        setCrossoverFile(null);
        // Reset file input
        const fileInput = document.getElementById('crossover-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setSportWrenchError(data.error || 'Upload failed');
      }
    } catch (err) {
      setSportWrenchError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingCrossover(false);
    }
  }

  // ==========================================
  // SCHEDULE EDITOR FUNCTIONS
  // ==========================================

  // Load courts list
  async function loadCourts() {
    try {
      const response = await fetch(`${API_URL}/api/courts`);
      if (response.ok) {
        const data = await response.json();
        setCourts(data);
      }
    } catch (err) {
      console.error('Failed to load courts:', err);
    }
  }

  // Load schedule for selected court
  async function loadSchedule(courtId: number) {
    setLoadingSchedule(true);
    setScheduleError(null);

    try {
      const response = await fetch(`${API_URL}/api/schedule/${courtId}`);
      if (!response.ok) {
        throw new Error('Failed to load schedule');
      }

      const data = await response.json();
      setScheduleGames(data.schedule || []);
      
      // Initialize editing state
      const editing: { [key: number]: { teamA: string; teamB: string } } = {};
      (data.schedule || []).forEach((game: ScheduleGame) => {
        editing[game.id] = { teamA: game.teamA, teamB: game.teamB };
      });
      setEditingGames(editing);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setLoadingSchedule(false);
    }
  }

  // Handle court selection change
  function handleCourtChange(courtId: number) {
    setSelectedCourtId(courtId);
    loadSchedule(courtId);
  }

  // Save game changes
  async function saveGame(gameId: number) {
    if (!selectedCourtId) return;
    
    const gameData = editingGames[gameId];
    if (!gameData) return;

    setSavingGameId(gameId);
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/schedule/${selectedCourtId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: gameId,
          teamA: gameData.teamA,
          teamB: gameData.teamB
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      setScheduleSuccess('✅ Game updated');
      
      // Update local state
      setScheduleGames(prev => 
        prev.map(g => g.id === gameId 
          ? { ...g, teamA: gameData.teamA, teamB: gameData.teamB }
          : g
        )
      );

      setTimeout(() => setScheduleSuccess(null), 3000);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingGameId(null);
    }
  }

  // Toggle crossover status for a game
  async function toggleCrossover(gameId: number, currentValue: boolean) {
    setTogglingCrossoverId(gameId);
    
    try {
      const response = await fetch(`${API_URL}/api/schedule/match/${gameId}/crossover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCrossover: !currentValue })
      });

      if (!response.ok) {
        throw new Error('Failed to update crossover status');
      }

      // Update local state immediately
      setScheduleGames(prev => 
        prev.map(g => g.id === gameId 
          ? { ...g, isCrossover: !currentValue }
          : g
        )
      );
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to toggle crossover');
    } finally {
      setTogglingCrossoverId(null);
    }
  }

  // Delete game and shift times
  async function deleteGame(gameId: number) {
    if (!selectedCourtId) return;
    
    if (!confirm('Delete this game? Later games will shift up by 1 hour.')) {
      return;
    }

    setDeletingGameId(gameId);
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/schedule/${selectedCourtId}/${gameId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete game');
      }

      const data = await response.json();
      setScheduleSuccess(`✅ Game deleted. ${data.gamesShifted} games shifted.`);
      
      // Reload schedule to get updated times
      loadSchedule(selectedCourtId);

      setTimeout(() => setScheduleSuccess(null), 3000);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingGameId(null);
    }
  }

  // Add new game
  async function addGame() {
    if (!selectedCourtId) return;
    if (!newGameTeamA.trim() || !newGameTeamB.trim()) {
      setScheduleError('Please enter both team names');
      return;
    }

    setAddingGame(true);
    setScheduleError(null);
    setScheduleSuccess(null);

    try {
      const response = await fetch(`${API_URL}/api/schedule/${selectedCourtId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamA: newGameTeamA.trim(),
          teamB: newGameTeamB.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add game');
      }

      setScheduleSuccess('✅ Game added');
      setShowAddGameModal(false);
      setNewGameTeamA('');
      setNewGameTeamB('');
      
      // Reload schedule
      loadSchedule(selectedCourtId);

      setTimeout(() => setScheduleSuccess(null), 3000);
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Failed to add game');
    } finally {
      setAddingGame(false);
    }
  }

  // Open schedule editor
  function handleOpenScheduleEditor() {
    setShowScheduleEditor(true);
    loadCourts();
    setSelectedCourtId(null);
    setScheduleGames([]);
    setScheduleError(null);
    setScheduleSuccess(null);
  }

  // Format time for display
  function formatTime(timeString: string): string {
    if (!timeString) return 'N/A';
    
    // If it's already a simple time format like "8:00 AM" or "09:00", return as-is
    if (/^\d{1,2}:\d{2}(\s*(AM|PM))?$/i.test(timeString.trim())) {
      return timeString.trim();
    }
    
    // Try to parse as ISO date
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      }
    } catch {
      // Fall through to return original
    }
    
    // Return original string if nothing worked
    return timeString;
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#000429' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="rounded-xl shadow-lg p-6 mb-6" style={{ backgroundColor: '#1a1a3e' }}>
          <h1 className="text-3xl font-bold" style={{ color: '#DDFD51' }}>Admin Dashboard</h1>
          <p className="mt-2" style={{ color: '#9a9ab8' }}>Manage schedules, device assignments, and logs</p>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl shadow-lg p-6 mb-6" style={{ backgroundColor: '#1a1a3e' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#DDFD51' }}>Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleOpenScheduleEditor}
              className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-80 flex items-center gap-2"
              style={{ backgroundColor: '#DDFD51', color: '#000429' }}
            >
              📅 Schedule Editor
            </button>
            <button
              onClick={handleOpenDeviceAssignment}
              className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-80 flex items-center gap-2"
              style={{ backgroundColor: '#DDFD51', color: '#000429' }}
            >
              📱 Assign Device IDs to Courts
            </button>
            <button
              onClick={handleOpenLabelEditor}
              className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-80 flex items-center gap-2"
              style={{ backgroundColor: '#DDFD51', color: '#000429' }}
            >
              🏷️ Edit Tournament Label
            </button>
            <button
              onClick={handleOpenSportWrenchSettings}
              className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-80 flex items-center gap-2"
              style={{ backgroundColor: '#DDFD51', color: '#000429' }}
            >
              🏐 SportWrench Sync
            </button>
          </div>
          <div className="mt-3 text-sm" style={{ color: '#9a9ab8' }}>
            Current label: <span style={{ color: '#DDFD51' }}>"{tournamentLabel}"</span>
            {sportWrenchEventId && (
              <span className="ml-4">
                SportWrench Event: <span style={{ color: '#DDFD51' }}>{sportWrenchEventId}</span>
              </span>
            )}
          </div>
        </div>

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

        {/* SportWrench Settings Panel */}
        {showSportWrenchSettings && (
          <div className="rounded-xl shadow-lg p-6 mb-6" style={{ backgroundColor: '#1a1a3e' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#DDFD51' }}>🏐 SportWrench Sync Settings</h2>
                <p className="text-sm mt-1" style={{ color: '#9a9ab8' }}>
                  Automatically sync team names from SportWrench every 5 minutes
                </p>
              </div>
              <button
                onClick={() => setShowSportWrenchSettings(false)}
                className="text-2xl hover:opacity-70 transition-opacity"
                style={{ color: '#DDFD51' }}
              >
                ✕
              </button>
            </div>

            {/* Error Message */}
            {sportWrenchError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                <strong>Error:</strong> {sportWrenchError}
              </div>
            )}

            {/* Success Message */}
            {sportWrenchSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                {sportWrenchSuccess}
              </div>
            )}

            {/* Sync Result */}
            {lastSyncResult && (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg mb-4">
                {lastSyncResult}
              </div>
            )}

            {/* Event ID Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>
                SportWrench Event ID (5-digit)
              </label>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={sportWrenchInput}
                  onChange={(e) => setSportWrenchInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="e.g., 12345"
                  maxLength={5}
                  className="flex-1 px-4 py-3 rounded-lg text-lg font-mono"
                  style={{ 
                    backgroundColor: '#000429', 
                    color: '#ffffff',
                    border: '2px solid #DDFD51'
                  }}
                />
                <button
                  onClick={saveSportWrenchEventId}
                  disabled={savingSportWrench}
                  className="py-3 px-6 rounded-lg font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                >
                  {savingSportWrench ? 'Saving...' : 'Save'}
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: '#9a9ab8' }}>
                Get this ID from SportWrench for your tournament
              </p>
            </div>

            {/* Current Status */}
            <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: '#000429' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#DDFD51' }}>Current Status</div>
                  <div className="text-sm mt-1" style={{ color: '#9a9ab8' }}>
                    {sportWrenchEventId ? (
                      <>
                        <span className="text-green-400">● Active</span>
                        <span className="ml-2">- Syncing event {sportWrenchEventId} every 5 minutes</span>
                      </>
                    ) : (
                      <>
                        <span className="text-yellow-400">● Inactive</span>
                        <span className="ml-2">- Enter an Event ID to enable sync</span>
                      </>
                    )}
                  </div>
                </div>
                {sportWrenchEventId && (
                  <button
                    onClick={triggerSportWrenchSync}
                    disabled={syncingSportWrench}
                    className="py-2 px-4 rounded-lg font-bold text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ backgroundColor: '#4a90d9', color: '#ffffff' }}
                  >
                    {syncingSportWrench ? '🔄 Syncing...' : '🔄 Sync Now'}
                  </button>
                )}
              </div>
            </div>

            {/* Import Section - show after Event ID is configured */}
            {sportWrenchEventId && (
              <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: 'rgba(221, 253, 81, 0.1)', border: '1px solid rgba(221, 253, 81, 0.3)' }}>
                <h3 className="font-bold mb-3" style={{ color: '#DDFD51' }}>📥 Step 1: Import Matches from SportWrench</h3>
                <p className="text-sm mb-4" style={{ color: '#9a9ab8' }}>
                  Import matches for specific courts. Multi-day tournaments are handled automatically (Day 1 matches scheduled before Day 2).
                </p>

                <div className="flex flex-wrap gap-4 mb-4">
                  <div>
                    <label className="block text-sm mb-1" style={{ color: '#9a9ab8' }}>Court Min</label>
                    <input
                      type="number"
                      value={importCourtMin}
                      onChange={(e) => setImportCourtMin(e.target.value)}
                      className="w-24 px-3 py-2 rounded-lg font-mono"
                      style={{ backgroundColor: '#000429', color: '#ffffff', border: '1px solid #DDFD51' }}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1" style={{ color: '#9a9ab8' }}>Court Max</label>
                    <input
                      type="number"
                      value={importCourtMax}
                      onChange={(e) => setImportCourtMax(e.target.value)}
                      className="w-24 px-3 py-2 rounded-lg font-mono"
                      style={{ backgroundColor: '#000429', color: '#ffffff', border: '1px solid #DDFD51' }}
                      min="1"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={importFromSportWrench}
                      disabled={importing}
                      className="px-6 py-2 rounded-lg font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                    >
                      {importing ? '⏳ Importing...' : '📥 Import Matches'}
                    </button>
                  </div>
                </div>

                {importResult && (
                  <div className="p-3 rounded-lg bg-green-900 text-green-200 text-sm">
                    {importResult}
                  </div>
                )}
              </div>
            )}

            {/* Crossover CSV Upload Section */}
            {sportWrenchEventId && (
              <div className="p-4 rounded-lg mb-6" style={{ backgroundColor: 'rgba(100, 100, 100, 0.2)', border: '1px solid rgba(100, 100, 100, 0.3)' }}>
                <h3 className="font-bold mb-3" style={{ color: '#DDFD51' }}>📋 Step 2: Upload Crossover Mapping (Optional)</h3>
                <p className="text-sm mb-4" style={{ color: '#9a9ab8' }}>
                  Upload a CSV to flag which matches are crossovers. This is optional.
                </p>

                <div className="mb-4">
                  <label className="block text-sm mb-2" style={{ color: '#9a9ab8' }}>CSV Format: MatchID,IsCrossover</label>
                  <div className="flex flex-wrap gap-4">
                    <input
                      id="crossover-file-input"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCrossoverFile(e.target.files?.[0] || null)}
                      className="flex-1 px-3 py-2 rounded-lg text-sm"
                      style={{ backgroundColor: '#000429', color: '#ffffff', border: '1px solid #666' }}
                    />
                    <button
                      onClick={uploadCrossoverMapping}
                      disabled={uploadingCrossover || !crossoverFile}
                      className="px-6 py-2 rounded-lg font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ backgroundColor: '#4a90d9', color: '#ffffff' }}
                    >
                      {uploadingCrossover ? '⏳ Uploading...' : '📤 Upload CSV'}
                    </button>
                  </div>
                  <p className="text-xs mt-2" style={{ color: '#666' }}>
                    Example: 24724_14 O_R1P5M6,true
                  </p>
                </div>

                {crossoverResult && (
                  <div className="p-3 rounded-lg bg-green-900 text-green-200 text-sm">
                    {crossoverResult}
                  </div>
                )}
              </div>
            )}

            {/* How It Works */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#000429' }}>
              <div className="text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>💡 How It Works</div>
              <ul className="text-sm space-y-2" style={{ color: '#9a9ab8' }}>
                <li>1. Enter your SportWrench 5-digit Event ID and save</li>
                <li>2. <strong>Import matches</strong> from SportWrench for your courts</li>
                <li>3. <strong>Optionally</strong> upload a CSV to mark crossover matches</li>
                <li>4. Team names will <strong>auto-sync</strong> every 5 minutes</li>
                <li>5. Multi-day tournaments: Day 1 matches are scheduled before Day 2</li>
              </ul>
            </div>

            {/* API Info */}
            {sportWrenchEventId && (
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#000429' }}>
                <div className="text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>🔗 API Endpoint</div>
                <code className="text-xs break-all" style={{ color: '#9a9ab8' }}>
                  https://my.sportwrench.com/api/tpc/export/{sportWrenchEventId}/schedule
                </code>
              </div>
            )}
          </div>
        )}

        {/* Schedule Editor Panel */}
        {showScheduleEditor && (
          <div className="rounded-xl shadow-lg p-6 mb-6" style={{ backgroundColor: '#1a1a3e' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#DDFD51' }}>📅 Schedule Editor</h2>
                <p className="text-sm mt-1" style={{ color: '#9a9ab8' }}>
                  View, edit, add, and delete scheduled games
                </p>
              </div>
              <button
                onClick={() => setShowScheduleEditor(false)}
                className="text-2xl hover:opacity-70 transition-opacity"
                style={{ color: '#DDFD51' }}
              >
                ✕
              </button>
            </div>

            {/* Court Selector */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>
                Select Court
              </label>
              <select
                value={selectedCourtId || ''}
                onChange={(e) => handleCourtChange(parseInt(e.target.value))}
                className="w-full md:w-64 px-4 py-3 rounded-lg text-lg"
                style={{ 
                  backgroundColor: '#000429', 
                  color: '#ffffff',
                  border: '2px solid #DDFD51'
                }}
              >
                <option value="">-- Choose a court --</option>
                {courts.map(court => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error/Success Messages */}
            {scheduleError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                <strong>Error:</strong> {scheduleError}
              </div>
            )}
            {scheduleSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                {scheduleSuccess}
              </div>
            )}

            {/* Schedule List */}
            {selectedCourtId && (
              <>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                    Games on Court {selectedCourtId}
                  </h3>
                  <button
                    onClick={() => setShowAddGameModal(true)}
                    className="font-bold py-2 px-4 rounded-lg transition-opacity hover:opacity-80 flex items-center gap-2"
                    style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                  >
                    ➕ Add Game
                  </button>
                </div>

                {loadingSchedule ? (
                  <div className="text-center py-8" style={{ color: '#9a9ab8' }}>
                    Loading schedule...
                  </div>
                ) : scheduleGames.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '2px solid #DDFD51' }}>
                          <th className="py-3 px-4 text-left font-bold" style={{ color: '#DDFD51', width: '100px' }}>Time</th>
                          <th className="py-3 px-4 text-left font-bold" style={{ color: '#DDFD51' }}>Team A</th>
                          <th className="py-3 px-4 text-left font-bold" style={{ color: '#DDFD51' }}>Team B</th>
                          <th className="py-3 px-4 text-center font-bold" style={{ color: '#DDFD51', width: '100px' }}>Crossover</th>
                          <th className="py-3 px-4 text-center font-bold" style={{ color: '#DDFD51', width: '80px' }}>Status</th>
                          <th className="py-3 px-4 text-center font-bold" style={{ color: '#DDFD51', width: '180px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scheduleGames.map((game) => (
                          <tr key={game.id} style={{ borderBottom: '1px solid #2a2a4e' }}>
                            <td className="py-3 px-4 font-mono font-semibold" style={{ color: '#DDFD51' }}>
                              {formatTime(game.time)}
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={editingGames[game.id]?.teamA || ''}
                                onChange={(e) => setEditingGames(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], teamA: e.target.value }
                                }))}
                                disabled={game.isCompleted}
                                className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                                style={{ 
                                  backgroundColor: '#000429', 
                                  color: '#ffffff',
                                  border: '1px solid #DDFD51'
                                }}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <input
                                type="text"
                                value={editingGames[game.id]?.teamB || ''}
                                onChange={(e) => setEditingGames(prev => ({
                                  ...prev,
                                  [game.id]: { ...prev[game.id], teamB: e.target.value }
                                }))}
                                disabled={game.isCompleted}
                                className="w-full px-3 py-2 rounded-lg text-sm disabled:opacity-50"
                                style={{ 
                                  backgroundColor: '#000429', 
                                  color: '#ffffff',
                                  border: '1px solid #DDFD51'
                                }}
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => toggleCrossover(game.id, game.isCrossover)}
                                disabled={togglingCrossoverId === game.id}
                                className="px-3 py-1 rounded-lg text-sm font-bold transition-all"
                                style={{
                                  backgroundColor: game.isCrossover ? '#DDFD51' : '#2a2a4e',
                                  color: game.isCrossover ? '#000429' : '#9a9ab8',
                                  border: game.isCrossover ? '2px solid #DDFD51' : '2px solid #666',
                                  opacity: togglingCrossoverId === game.id ? 0.5 : 1
                                }}
                              >
                                {togglingCrossoverId === game.id ? '...' : (game.isCrossover ? 'YES' : 'NO')}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {game.isCompleted ? (
                                <span className="text-green-400 text-sm">✅ Done</span>
                              ) : (
                                <span className="text-yellow-400 text-sm">⏳ Pending</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => saveGame(game.id)}
                                  disabled={savingGameId === game.id || game.isCompleted}
                                  className="font-bold py-2 px-3 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                                  style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                                >
                                  {savingGameId === game.id ? '...' : 'Save'}
                                </button>
                                <button
                                  onClick={() => deleteGame(game.id)}
                                  disabled={deletingGameId === game.id}
                                  className="font-bold py-2 px-3 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                                  style={{ backgroundColor: '#ff4444', color: '#ffffff' }}
                                >
                                  {deletingGameId === game.id ? '...' : '🗑️'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8" style={{ color: '#9a9ab8' }}>
                    No games scheduled for this court. Click "Add Game" to create one.
                  </div>
                )}
              </>
            )}

            {!selectedCourtId && (
              <div className="text-center py-8" style={{ color: '#9a9ab8' }}>
                Select a court to view and edit its schedule
              </div>
            )}
          </div>
        )}

        {/* Add Game Modal */}
        {showAddGameModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full" style={{ backgroundColor: '#1a1a3e' }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold" style={{ color: '#DDFD51' }}>
                  ➕ Add New Game
                </h2>
                <button
                  onClick={() => {
                    setShowAddGameModal(false);
                    setNewGameTeamA('');
                    setNewGameTeamB('');
                  }}
                  className="text-2xl hover:opacity-70 transition-opacity"
                  style={{ color: '#DDFD51' }}
                >
                  ✕
                </button>
              </div>

              <p className="text-sm mb-4" style={{ color: '#9a9ab8' }}>
                New game will be scheduled 1 hour after the last game on Court {selectedCourtId}
              </p>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>
                  Team A
                </label>
                <input
                  type="text"
                  value={newGameTeamA}
                  onChange={(e) => setNewGameTeamA(e.target.value)}
                  placeholder="Enter Team A name..."
                  className="w-full px-4 py-3 rounded-lg text-lg"
                  style={{ 
                    backgroundColor: '#000429', 
                    color: '#ffffff',
                    border: '2px solid #DDFD51'
                  }}
                  autoFocus
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2" style={{ color: '#DDFD51' }}>
                  Team B
                </label>
                <input
                  type="text"
                  value={newGameTeamB}
                  onChange={(e) => setNewGameTeamB(e.target.value)}
                  placeholder="Enter Team B name..."
                  className="w-full px-4 py-3 rounded-lg text-lg"
                  style={{ 
                    backgroundColor: '#000429', 
                    color: '#ffffff',
                    border: '2px solid #DDFD51'
                  }}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowAddGameModal(false);
                    setNewGameTeamA('');
                    setNewGameTeamB('');
                  }}
                  className="flex-1 py-3 px-6 rounded-lg font-bold transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#2a2a4e', color: '#ffffff' }}
                >
                  Cancel
                </button>
                <button
                  onClick={addGame}
                  disabled={addingGame || !newGameTeamA.trim() || !newGameTeamB.trim()}
                  className="flex-1 py-3 px-6 rounded-lg font-bold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                >
                  {addingGame ? 'Adding...' : 'Add Game'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Device Assignment Panel */}
        {showDeviceAssignment && (
          <div className="rounded-xl shadow-lg p-6 mb-6" style={{ backgroundColor: '#1a1a3e' }}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold" style={{ color: '#DDFD51' }}>📱 Assign Larix Device IDs</h2>
                <p className="text-sm mt-1" style={{ color: '#9a9ab8' }}>
                  Enter the device ID from LarixTuner for each court
                </p>
              </div>
              <button
                onClick={() => setShowDeviceAssignment(false)}
                className="text-2xl hover:opacity-70 transition-opacity"
                style={{ color: '#DDFD51' }}
              >
                ✕
              </button>
            </div>

            {deviceError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                <strong>Error:</strong> {deviceError}
              </div>
            )}

            {deviceSuccess && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
                {deviceSuccess}
              </div>
            )}

            {loadingDevices ? (
              <div className="text-center py-8" style={{ color: '#9a9ab8' }}>
                Loading courts...
              </div>
            ) : courtDevices.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0" style={{ backgroundColor: '#1a1a3e' }}>
                    <tr style={{ borderBottom: '2px solid #DDFD51' }}>
                      <th className="py-3 px-4 text-left font-bold" style={{ color: '#DDFD51' }}>Court</th>
                      <th className="py-3 px-4 text-left font-bold" style={{ color: '#DDFD51' }}>Device ID</th>
                      <th className="py-3 px-4 text-left font-bold" style={{ color: '#DDFD51' }}>Status</th>
                      <th className="py-3 px-4 text-center font-bold" style={{ color: '#DDFD51' }}>Save</th>
                      <th className="py-3 px-4 text-center font-bold" style={{ color: '#DDFD51' }}>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courtDevices.map((court) => (
                      <tr key={court.courtId} style={{ borderBottom: '1px solid #2a2a4e' }}>
                        <td className="py-3 px-4 font-semibold" style={{ color: '#ffffff' }}>
                          {court.courtName}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={deviceInputs[court.courtId] || ''}
                            onChange={(e) => setDeviceInputs(prev => ({
                              ...prev,
                              [court.courtId]: e.target.value
                            }))}
                            placeholder="Enter device ID..."
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ 
                              backgroundColor: '#000429', 
                              color: '#ffffff',
                              border: '1px solid #DDFD51'
                            }}
                          />
                        </td>
                        <td className="py-3 px-4">
                          {court.larixDeviceId ? (
                            <span className="text-green-400 text-sm">✅ Assigned</span>
                          ) : (
                            <span className="text-yellow-400 text-sm">⚠️ Not set</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => saveDeviceId(court.courtId)}
                            disabled={savingDevice === court.courtId}
                            className="font-bold py-2 px-4 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                          >
                            {savingDevice === court.courtId ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => deleteDeviceId(court.courtId)}
                            disabled={deletingDevice === court.courtId || !court.larixDeviceId}
                            className="font-bold py-2 px-4 rounded-lg text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
                            style={{ backgroundColor: '#ff4444', color: '#ffffff' }}
                          >
                            {deletingDevice === court.courtId ? '...' : '🗑️'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: '#9a9ab8' }}>
                No courts found. Make sure the backend is running.
              </div>
            )}

            <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: '#000429' }}>
              <p className="text-sm" style={{ color: '#9a9ab8' }}>
                <strong style={{ color: '#DDFD51' }}>💡 Tip:</strong> Find device IDs in your LarixTuner dashboard at{' '}
                <a 
                  href="https://larixtuner.softvelum.com/account/devices" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#DDFD51', textDecoration: 'underline' }}
                >
                  larixtuner.softvelum.com/account/devices
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="rounded-xl shadow-lg p-8" style={{ backgroundColor: '#1a1a3e' }}>
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: '#DDFD51' }}>Upload Schedule</h2>
            <p className="text-sm mb-4" style={{ color: '#9a9ab8' }}>
              Upload a CSV or Excel file with columns: Court, StartTime, TeamA, TeamB, MatchID (optional)
            </p>
            
            <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: '#DDFD51' }}>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center gap-2 font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-80"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                <span>📁</span>
                <span>Choose File</span>
              </label>
              {file && (
                <div className="mt-4" style={{ color: '#DDFD51' }}>
                  Selected: <span className="font-semibold">{file.name}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="mt-4 w-full font-bold py-4 px-6 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#DDFD51', color: '#000429' }}
            >
              {uploading ? 'Uploading...' : 'Upload Schedule'}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              <div className="font-bold mb-2">✓ Upload Successful!</div>
              <div>Matches created: {result.matchesCreated}</div>
              {result.matches && result.matches.length > 0 && (
                <div className="mt-4">
                  <div className="font-semibold mb-2">Matches:</div>
                  <div className="max-h-64 overflow-y-auto bg-white rounded p-3">
                    {result.matches.map((match: any) => (
                      <div key={match.id} className="text-sm mb-2 pb-2 border-b border-gray-200">
                        Court {match.court_id}: {match.team_a} vs {match.team_b}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-xl shadow-lg p-6 mt-6" style={{ backgroundColor: '#1a1a3e' }}>
          <h2 className="text-xl font-bold mb-4" style={{ color: '#DDFD51' }}>CSV Format Example</h2>
          <pre className="p-4 rounded-lg text-sm overflow-x-auto" style={{ backgroundColor: '#000429', color: '#DDFD51' }}>
{`Court,StartTime,TeamA,TeamB,MatchID
1,09:00,Spikers United,Net Warriors,M001
2,09:00,Block Party,Set Point,M002
3,09:15,Court Jesters,Dig Deep,M003`}
          </pre>
        </div>

        {/* Match Logs Section */}
        <div className="rounded-xl shadow-lg p-8 mt-6" style={{ backgroundColor: '#1a1a3e' }}>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#DDFD51' }}>Match Logs</h2>
              <p className="text-sm mt-1" style={{ color: '#9a9ab8' }}>
                View and export match timing data
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadMatchLogs}
                disabled={loadingLogs}
                className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: '#DDFD51', color: '#000429' }}
              >
                {loadingLogs ? 'Loading...' : '🔄 Load Logs'}
              </button>
              {matchLogs.length > 0 && (
                <button
                  onClick={exportLogsToCSV}
                  className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#DDFD51', color: '#000429' }}
                >
                  📥 Export CSV
                </button>
              )}
            </div>
          </div>

          {logsError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
              <strong>Error:</strong> {logsError}
            </div>
          )}

          {matchLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr style={{ borderBottom: '2px solid #DDFD51' }}>
                    <th className="py-3 px-4 font-bold" style={{ color: '#DDFD51' }}>Court</th>
                    <th className="py-3 px-4 font-bold" style={{ color: '#DDFD51' }}>Match ID</th>
                    <th className="py-3 px-4 font-bold" style={{ color: '#DDFD51' }}>Team A</th>
                    <th className="py-3 px-4 font-bold" style={{ color: '#DDFD51' }}>Team B</th>
                    <th className="py-3 px-4 font-bold" style={{ color: '#DDFD51' }}>Start Time</th>
                    <th className="py-3 px-4 font-bold" style={{ color: '#DDFD51' }}>End Time</th>
                  </tr>
                </thead>
                <tbody>
                  {matchLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #2a2a4e' }}>
                      <td className="py-3 px-4" style={{ color: '#ffffff' }}>{log.court_id}</td>
                      <td className="py-3 px-4" style={{ color: '#ffffff' }}>{log.match_id}</td>
                      <td className="py-3 px-4" style={{ color: '#ffffff' }}>{log.team_a}</td>
                      <td className="py-3 px-4" style={{ color: '#ffffff' }}>{log.team_b}</td>
                      <td className="py-3 px-4" style={{ color: '#ffffff' }}>
                        {log.start_time ? new Date(log.start_time).toLocaleString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4" style={{ color: log.end_time ? '#DDFD51' : '#ff9999' }}>
                        {log.end_time ? new Date(log.end_time).toLocaleString() : '⏱️ In Progress'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: '#9a9ab8' }}>
              {loadingLogs ? 'Loading logs...' : 'No logs loaded. Click "Load Logs" to view match timing data.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUI;

