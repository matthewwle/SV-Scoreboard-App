import { createClient } from 'redis';
import { ScoreUpdatePayload } from './types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');
const redisPassword = process.env.REDIS_PASSWORD || undefined;

export const redisClient = createClient({
  socket: {
    host: redisHost,
    port: redisPort
  },
  password: redisPassword
});

export const redisPubClient = redisClient.duplicate();
export const redisSubClient = redisClient.duplicate();

let isRedisConnected = false;

export async function connectRedis() {
  try {
    await redisClient.connect();
    await redisPubClient.connect();
    await redisSubClient.connect();
    isRedisConnected = true;
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Redis connection error:', error);
    console.log('Continuing without Redis (single instance mode)');
    isRedisConnected = false;
  }
}

// Cache operations
export async function cacheScoreState(courtId: number, payload: ScoreUpdatePayload): Promise<void> {
  if (!isRedisConnected) return;
  
  try {
    const key = `court:${courtId}:score`;
    await redisClient.setEx(key, 3600, JSON.stringify(payload)); // Cache for 1 hour
  } catch (error) {
    console.error('Redis cache error:', error);
  }
}

export async function getCachedScoreState(courtId: number): Promise<ScoreUpdatePayload | null> {
  if (!isRedisConnected) return null;
  
  try {
    const key = `court:${courtId}:score`;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('Redis get cache error:', error);
    return null;
  }
}

// Pub/Sub operations
export async function publishScoreUpdate(courtId: number, payload: ScoreUpdatePayload): Promise<void> {
  if (!isRedisConnected) return;
  
  try {
    const channel = `court:${courtId}`;
    await redisPubClient.publish(channel, JSON.stringify(payload));
  } catch (error) {
    console.error('Redis publish error:', error);
  }
}

export async function subscribeToCourtUpdates(courtId: number, callback: (payload: ScoreUpdatePayload) => void): Promise<void> {
  if (!isRedisConnected) return;
  
  try {
    const channel = `court:${courtId}`;
    await redisSubClient.subscribe(channel, (message) => {
      const payload = JSON.parse(message);
      callback(payload);
    });
  } catch (error) {
    console.error('Redis subscribe error:', error);
  }
}

