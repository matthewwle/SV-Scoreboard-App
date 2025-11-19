# Volleyball Scoreboard System

A real-time volleyball scoreboard system built for 70 courts with live streaming overlay support. Similar to keepthescore.com, optimized for Larix Broadcaster integration.

## Features

- ✅ **Real-time scoring** with WebSocket updates (<200ms latency)
- ✅ **70 courts** support with isolated state
- ✅ **Automatic volleyball set logic** (first to 25, win by 2)
- ✅ **Transparent overlay** for streaming (Larix compatible)
- ✅ **Tablet scorekeeper UI** with persistent court selection
- ✅ **Spreadsheet import** for match scheduling
- ✅ **Redis caching** and pub/sub for scaling
- ✅ **Best of 3 format** with automatic set tracking

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Control   │◄────►│   Backend    │◄────►│  Database   │
│     UI      │ WS   │ Express +    │      │  Supabase   │
│  (Tablet)   │      │  Socket.IO   │      │  Postgres   │
└─────────────┘      └──────────────┘      └─────────────┘
                            ▲
┌─────────────┐            │                ┌─────────────┐
│   Overlay   │◄───────────┘                │    Redis    │
│     UI      │ WS                          │ Cache/Pub   │
│  (Stream)   │                             └─────────────┘
└─────────────┘
```

## Tech Stack

### Backend
- Node.js + Express
- Socket.IO (WebSockets)
- Supabase (PostgreSQL)
- Redis (caching & pub/sub)
- TypeScript

### Frontend
- React 18
- Vite
- Tailwind CSS
- Socket.IO Client
- TypeScript

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (or PostgreSQL)
- Redis (optional, for production scaling)

### 1. Setup Database

1. Create a Supabase project or PostgreSQL database
2. Run the schema:
   ```bash
   psql your_database < database/schema.sql
   ```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

**Backend .env variables:**
```
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:5173
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

**Frontend .env variables:**
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

### 4. Access the Application

- **Control UI (Scorekeeper):** http://localhost:5173/control
- **Overlay (Streaming):** http://localhost:5173/court/{courtId}
- **Admin (Upload Schedule):** http://localhost:5173/admin

## Usage

### Scorekeeper (Tablet)

1. Open `/control` on your tablet
2. Select your court number (1-70)
3. Court selection is saved in localStorage (persists all day)
4. Tap the logo 5 times to reset court selection
5. Use +/− buttons to adjust scores
6. Click "Reset Set" to reset current set to 0-0
7. Click "Swap Sides" to swap team positions

### Overlay (Streaming)

1. Open `/court/{courtId}` in Larix Broadcaster
2. Use "Browser Overlay" feature in Larix
3. Transparent background automatically applied
4. Updates in real-time (<200ms)

### Admin (Schedule Upload)

1. Open `/admin`
2. Upload CSV or Excel file with columns:
   - `Court` (number)
   - `StartTime` (string)
   - `TeamA` (string)
   - `TeamB` (string)
   - `MatchID` (optional)
3. Matches are automatically assigned to courts

**Example CSV:**
```csv
Court,StartTime,TeamA,TeamB,MatchID
1,09:00,Spikers United,Net Warriors,M001
2,09:00,Block Party,Set Point,M002
3,09:15,Court Jesters,Dig Deep,M003
```

## API Reference

### Court APIs

- `GET /api/court/:id` - Get court details
- `GET /api/court/:id/currentMatch` - Get current match for court
- `GET /api/courts` - Get all courts
- `POST /api/court/:id/resetCourtAssignment` - Clear court's current match
- `POST /api/court/:id/overrideMatch` - Assign specific match to court

### Score APIs

- `POST /api/score/increment` - Increment team score
  ```json
  { "courtId": 1, "team": "A" }
  ```
- `POST /api/score/decrement` - Decrement team score
  ```json
  { "courtId": 1, "team": "B" }
  ```
- `POST /api/score/resetSet` - Reset current set to 0-0
  ```json
  { "courtId": 1 }
  ```
- `POST /api/score/swapSides` - Swap team sides
  ```json
  { "courtId": 1 }
  ```
- `GET /api/score/current/:courtId` - Get current score state

### Admin APIs

- `POST /api/admin/uploadSchedule` - Upload match schedule (multipart/form-data)

### WebSocket Events

**Client → Server:**
- `joinCourt` - Join a court's room
  ```javascript
  socket.emit('joinCourt', courtId);
  ```
- `leaveCourt` - Leave a court's room
  ```javascript
  socket.emit('leaveCourt', courtId);
  ```

**Server → Client:**
- `score:update` - Score state update
  ```javascript
  socket.on('score:update', (payload) => {
    // payload: ScoreUpdatePayload
  });
  ```

## Volleyball Scoring Rules

### Set Rules
- First team to **25 points** wins the set
- Must win by **2 points** minimum
- If tied at 24-24, play continues until 2-point lead

### Match Rules
- Best of **3 sets**
- First team to win **2 sets** wins the match
- After a set is won:
  - Sets won counter increments
  - Scores reset to 0-0
  - Set number increments

## Deployment

### Backend (AWS ECS/Fargate)

1. Build Docker image:
   ```bash
   cd backend
   docker build -t scoreboard-backend .
   ```

2. Push to ECR and deploy to ECS
3. Configure ALB for WebSocket support
4. Set environment variables in ECS task definition

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### Database (Supabase)

1. Create project in Supabase
2. Run schema.sql in SQL Editor
3. Enable RLS policies if needed

### Redis (AWS ElastiCache)

1. Create Redis cluster
2. Update REDIS_HOST in backend .env
3. Ensure security groups allow backend access

## Scaling

The system is designed to handle 70 courts simultaneously:

- **Expected connections:** ~360 (2 control + 1 overlay per court)
- **Redis pub/sub:** Enables horizontal scaling of backend instances
- **Socket.IO rooms:** Isolated state per court (`court_1`, `court_2`, etc.)
- **Caching:** Score states cached in Redis for fast loading

## Project Structure

```
volleyball-scoreboard/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Express + Socket.IO server
│   │   ├── routes.ts          # API routes
│   │   ├── db.ts              # Database operations
│   │   ├── redis.ts           # Redis client & operations
│   │   ├── scoring.ts         # Scoring logic
│   │   └── types.ts           # TypeScript types
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── ControlUI.tsx  # Scorekeeper interface
│   │   │   ├── OverlayUI.tsx  # Streaming overlay
│   │   │   └── AdminUI.tsx    # Schedule upload
│   │   ├── hooks/
│   │   │   └── useSocket.ts   # WebSocket hook
│   │   ├── App.tsx
│   │   ├── config.ts
│   │   └── types.ts
│   └── package.json
├── database/
│   └── schema.sql             # Database schema
└── README.md
```

## Development

### Run in Development

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Or use the root workspace:
```bash
npm run dev  # Runs both concurrently
```

### Testing

1. Open Control UI and select a court
2. Open Overlay UI for same court in another tab
3. Increment scores and watch real-time updates
4. Test set win logic (reach 25 with 2-point lead)
5. Test "Swap Sides" and "Reset Set" functions

## Troubleshooting

### WebSocket not connecting
- Check CORS settings in backend
- Verify WS_URL in frontend .env
- Check browser console for errors

### Scores not updating
- Verify court has a current match assigned
- Check backend logs for errors
- Ensure database connection is working

### Redis errors (development)
- Redis is optional for single-instance development
- Backend will log warning and continue without Redis
- For production, ensure Redis is running and accessible

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

