// Database Models
export interface Court {
  id: number;
  name: string;
  current_match_id: number | null;
  created_at?: string;
}

export interface Match {
  id: number;
  court_id: number;
  team_a: string;
  team_b: string;
  sets_a: number;
  sets_b: number;
  start_time: string;
  is_completed: boolean;
  created_at?: string;
}

export interface ScoreState {
  id?: number;
  match_id: number;
  set_number: number;
  team_a_score: number;
  team_b_score: number;
  set_history?: string; // JSON string of SetScore[]
  updated_at?: string;
}

// WebSocket Payloads
export interface SetScore {
  teamAScore: number;
  teamBScore: number;
}

export interface ScoreUpdatePayload {
  courtId: number;
  matchId: number;
  teamA: string;
  teamB: string;
  teamAScore: number;
  teamBScore: number;
  setsA: number;
  setsB: number;
  setNumber: number;
  setHistory: SetScore[];
  updatedAt: string;
  pendingSetWin?: 'A' | 'B' | null;  // Track if a set win is pending confirmation
}

// API Request/Response Types
export interface IncrementRequest {
  courtId: number;
  team: 'A' | 'B';
}

export interface DecrementRequest {
  courtId: number;
  team: 'A' | 'B';
}

export interface ResetSetRequest {
  courtId: number;
}

export interface SwapSidesRequest {
  courtId: number;
}

export interface UploadScheduleRow {
  Court: number;
  StartTime: string;
  TeamA: string;
  TeamB: string;
  MatchID?: string;
}

