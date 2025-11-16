import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../config';
import { ScoreUpdatePayload } from '../types';

export function useSocket(courtId: number | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [scoreState, setScoreState] = useState<ScoreUpdatePayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!courtId) return;

    const socketInstance = io(WS_URL, {
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      socketInstance.emit('joinCourt', courtId);
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('score:update', (payload: ScoreUpdatePayload) => {
      console.log('Score update received:', payload);
      setScoreState(payload);
    });

    setSocket(socketInstance);

    return () => {
      if (courtId) {
        socketInstance.emit('leaveCourt', courtId);
      }
      socketInstance.disconnect();
    };
  }, [courtId]);

  return { socket, scoreState, isConnected };
}

