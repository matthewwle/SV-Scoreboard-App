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

      const data = await response.json();
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

  // Handle opening device assignment panel
  function handleOpenDeviceAssignment() {
    setShowDeviceAssignment(true);
    loadCourtDevices();
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
              onClick={handleOpenDeviceAssignment}
              className="font-bold py-3 px-6 rounded-lg transition-opacity hover:opacity-80 flex items-center gap-2"
              style={{ backgroundColor: '#DDFD51', color: '#000429' }}
            >
              📱 Assign Device IDs to Courts
            </button>
          </div>
        </div>

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
                      <th className="py-3 px-4 text-center font-bold" style={{ color: '#DDFD51' }}>Action</th>
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

