import { CourtScoreState, ScoreUpdatePayload, SetScore } from './types';
import {
  getCourtScoreState,
  upsertCourtScoreState,
  resetCourtScoreState as dbResetCourtScoreState,
} from './db';
import { cacheScoreState, publishScoreUpdate } from './redis';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export function setSocketIO(socketInstance: SocketIOServer) {
  io = socketInstance;
}

const setHistoryCache = new Map<number, SetScore[]>();

function getSetHistory(courtId: number): SetScore[] {
  return setHistoryCache.get(courtId) || [];
}

function addSetToHistory(courtId: number, setScore: SetScore): void {
  const history = getSetHistory(courtId);
  history.push(setScore);
  setHistoryCache.set(courtId, history);
}

export function clearSetHistory(courtId: number): void {
  setHistoryCache.delete(courtId);
}

function checkSetWin(
  leftScore: number,
  rightScore: number,
  setNumber: number
): 'left' | 'right' | null {
  const targetScore = setNumber === 3 ? 15 : 25;
  if (
    (leftScore >= targetScore || rightScore >= targetScore) &&
    Math.abs(leftScore - rightScore) >= 2
  ) {
    return leftScore > rightScore ? 'left' : 'right';
  }
  return null;
}

function buildScorePayload(
  courtId: number,
  state: CourtScoreState,
  pendingSetWin?: 'left' | 'right' | null
): ScoreUpdatePayload {
  const setHistory = getSetHistory(courtId);
  return {
    courtId,
    leftScore: state.left_score,
    rightScore: state.right_score,
    setsLeft: state.sets_left,
    setsRight: state.sets_right,
    setNumber: state.set_number,
    setHistory,
    updatedAt: new Date().toISOString(),
    pendingSetWin: pendingSetWin || null,
  };
}

async function broadcastScoreUpdate(payload: ScoreUpdatePayload): Promise<void> {
  const { courtId } = payload;
  await cacheScoreState(courtId, payload);
  if (io) {
    io.to(`court_${courtId}`).emit('score:update', payload);
  }
  await publishScoreUpdate(courtId, payload);
}

export async function broadcastScoreToClients(payload: ScoreUpdatePayload): Promise<void> {
  await broadcastScoreUpdate(payload);
}

async function getOrCreateCourtScoreState(courtId: number): Promise<CourtScoreState | null> {
  let state = await getCourtScoreState(courtId);
  if (!state) {
    state = {
      court_id: courtId,
      set_number: 1,
      left_score: 0,
      right_score: 0,
      sets_left: 0,
      sets_right: 0,
    };
    state = await upsertCourtScoreState(state);
  }
  return state;
}

export async function incrementScore(
  courtId: number,
  side: 'left' | 'right'
): Promise<ScoreUpdatePayload | null> {
  const state = await getOrCreateCourtScoreState(courtId);
  if (!state) return null;

  if (side === 'left') {
    state.left_score += 1;
  } else {
    state.right_score += 1;
  }

  const winner = checkSetWin(state.left_score, state.right_score, state.set_number);
  await upsertCourtScoreState(state);

  const payload = buildScorePayload(courtId, state, winner);
  await broadcastScoreUpdate(payload);
  return payload;
}

export async function confirmSetWin(courtId: number): Promise<ScoreUpdatePayload | null> {
  const state = await getCourtScoreState(courtId);
  if (!state) return null;

  const winner = checkSetWin(state.left_score, state.right_score, state.set_number);
  if (!winner) return null;

  addSetToHistory(courtId, {
    leftScore: state.left_score,
    rightScore: state.right_score,
  });

  if (winner === 'left') {
    state.sets_left += 1;
  } else {
    state.sets_right += 1;
  }

  const setsToWin = 2;
  const gameOver = state.sets_left >= setsToWin || state.sets_right >= setsToWin;

  if (gameOver) {
    await upsertCourtScoreState(state);
    const payload = buildScorePayload(courtId, state, null);
    await broadcastScoreUpdate(payload);
    return payload;
  }

  state.set_number += 1;
  state.left_score = 0;
  state.right_score = 0;
  await upsertCourtScoreState(state);

  const payload = buildScorePayload(courtId, state, null);
  await broadcastScoreUpdate(payload);
  return payload;
}

export async function decrementScore(
  courtId: number,
  side: 'left' | 'right'
): Promise<ScoreUpdatePayload | null> {
  const state = await getCourtScoreState(courtId);
  if (!state) return null;

  if (side === 'left') {
    state.left_score = Math.max(0, state.left_score - 1);
  } else {
    state.right_score = Math.max(0, state.right_score - 1);
  }

  await upsertCourtScoreState(state);
  const winner = checkSetWin(state.left_score, state.right_score, state.set_number);
  const payload = buildScorePayload(courtId, state, winner);
  await broadcastScoreUpdate(payload);
  return payload;
}

export async function resetSet(courtId: number): Promise<ScoreUpdatePayload | null> {
  const state = await getCourtScoreState(courtId);
  if (!state) return null;

  state.left_score = 0;
  state.right_score = 0;
  await upsertCourtScoreState(state);

  const payload = buildScorePayload(courtId, state);
  await broadcastScoreUpdate(payload);
  return payload;
}

export async function resetGame(courtId: number): Promise<ScoreUpdatePayload | null> {
  clearSetHistory(courtId);
  const state = await dbResetCourtScoreState(courtId);
  if (!state) return null;

  const payload = buildScorePayload(courtId, state);
  await broadcastScoreUpdate(payload);
  return payload;
}

export async function getCurrentScoreState(courtId: number): Promise<ScoreUpdatePayload | null> {
  const state = await getOrCreateCourtScoreState(courtId);
  if (!state) return null;
  return buildScorePayload(courtId, state);
}
