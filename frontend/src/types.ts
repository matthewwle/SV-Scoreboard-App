// Shared types (matching backend)
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
  pendingSetWin?: 'A' | 'B' | null;
}

export interface Court {
  id: number;
  name: string;
  current_match_id: number | null;
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
}

