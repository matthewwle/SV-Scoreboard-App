// Shared types (matching backend)
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
