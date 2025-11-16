import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { connectRedis, getCachedScoreState } from './redis';
import { initializeCourts } from './db';
import { getCurrentScoreState, setSocketIO } from './scoring';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Configure CORS
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: [frontendUrl, 'http://localhost:5173', 'http://localhost:5174'],
    credentials: true
  }
});

// Set the Socket.IO instance for scoring module
setSocketIO(io);

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join a court room
  socket.on('joinCourt', async (courtId: number) => {
    const room = `court_${courtId}`;
    socket.join(room);
    console.log(`Client ${socket.id} joined ${room}`);

    // Send current score state immediately
    try {
      // Try to get from cache first
      let scoreState = await getCachedScoreState(courtId);
      
      // If not in cache, get from database
      if (!scoreState) {
        scoreState = await getCurrentScoreState(courtId);
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
    await initializeCourts(120);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

