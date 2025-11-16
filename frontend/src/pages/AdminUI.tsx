import { useState } from 'react';
import { API_URL } from '../config';

function AdminUI() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#000429' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="rounded-xl shadow-lg p-6 mb-6" style={{ backgroundColor: '#1a1a3e' }}>
          <h1 className="text-3xl font-bold" style={{ color: '#DDFD51' }}>Admin Dashboard</h1>
          <p className="mt-2" style={{ color: '#9a9ab8' }}>Upload match schedule spreadsheet</p>
        </div>

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
      </div>
    </div>
  );
}

export default AdminUI;

