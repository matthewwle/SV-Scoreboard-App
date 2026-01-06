import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { connectRedis, getCachedScoreState } from './redis';
import { initializeCourts } from './db';
import { getCurrentScoreState, setSocketIO } from './scoring';
import { startSportWrenchSync } from './sportwrenchSync';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

// Allow localhost + Vercel deployments + custom domains
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  frontendUrl,
  /https:\/\/.*\.vercel\.app$/,  // All Vercel deployments
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') return allowed === origin;
        if (allowed instanceof RegExp) return allowed.test(origin);
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }
});

// Set the Socket.IO instance for scoring module
setSocketIO(io);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a court room
  socket.on('joinCourt', async (data: { courtId: number; tournamentId: number } | number) => {
    // Handle both old format (just courtId) and new format (object with courtId and tournamentId)
    const courtId = typeof data === 'number' ? data : data.courtId;
    const tournamentId = typeof data === 'number' ? null : data.tournamentId;
    
    if (!tournamentId) {
      console.warn(`Client ${socket.id} joined court ${courtId} without tournamentId - score state may not load`);
      socket.emit('error', { message: 'tournamentId is required' });
      return;
    }
    
    const room = `court_${courtId}_tournament_${tournamentId}`;
    socket.join(room);
    console.log(`Client ${socket.id} joined ${room}`);

    // Send current score state immediately
    try {
      // Try to get from cache first
      let scoreState = await getCachedScoreState(courtId);
      
      // If not in cache, get from database
      if (!scoreState) {
        scoreState = await getCurrentScoreState(courtId, tournamentId);
      }

      if (scoreState) {
        socket.emit('score:update', scoreState);
      }
    } catch (error) {
      console.error('Error fetching score state:', error);
    }
  });

  // Leave a court room
  socket.on('leaveCourt', (courtId: number) => {
    const room = `court_${courtId}`;
    socket.leave(room);
    console.log(`Client ${socket.id} left ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// API routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to Redis
    await connectRedis();

    // Initialize courts in database
    await initializeCourts(70);

    // Start SportWrench sync service (will only sync if Event ID is configured)
    // The sync service polls every 5 minutes and updates team names from SportWrench
    startSportWrenchSync(io);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready`);
      console.log(`SportWrench sync service initialized (configure Event ID via Admin Panel)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

