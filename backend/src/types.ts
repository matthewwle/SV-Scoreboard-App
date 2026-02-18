// Database Models
export interface Tournament {
  id: number;
  label: string;
  court_count: number;
  is_active: boolean;
  created_at?: string;
}

export interface Court {
  id: number;
  tournament_id: number;
  court_number: number;
  name: string;
  created_at?: string;
}

export interface CourtScoreState {
  court_id: number;
  set_number: number;
  left_score: number;
  right_score: number;
  sets_left: number;
  sets_right: number;
  updated_at?: string;
}

// WebSocket Payloads
export interface SetScore {
  leftScore: number;
  rightScore: number;
}

export interface ScoreUpdatePayload {
  courtId: number;
  leftScore: number;
  rightScore: number;
  setsLeft: number;
  setsRight: number;
  setNumber: number;
  setHistory: SetScore[];
  updatedAt: string;
  pendingSetWin?: 'left' | 'right' | null;
}

// API Request/Response Types
export interface IncrementRequest {
  courtId: number;
  side: 'left' | 'right';
}

export interface DecrementRequest {
  courtId: number;
  side: 'left' | 'right';
}

export interface ResetSetRequest {
  courtId: number;
}

export interface ResetGameRequest {
  courtId: number;
}
