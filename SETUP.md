# Quick Setup Guide

Follow these steps to get your volleyball scoreboard system running locally.

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git

## Step 1: Clone & Install

```bash
# Navigate to project directory
cd "keepthescore clone"

# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Step 2: Database Setup

### Option A: Use Supabase (Recommended)

1. Create a free account at https://supabase.com
2. Create a new project
3. Go to SQL Editor
4. Copy and paste the contents of `database/schema.sql`
5. Run the SQL script
6. Go to Settings → API to get your credentials

### Option B: Local PostgreSQL

```bash
# Create database
createdb volleyball_scoreboard

# Run schema
psql volleyball_scoreboard < database/schema.sql
```

## Step 3: Configure Backend

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env
```

**Required .env values:**
```bash
PORT=3001
NODE_ENV=development

# Supabase credentials
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_anon_public_key

# Redis (optional for local development)
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS
FRONTEND_URL=http://localhost:5173
```

## Step 4: Configure Frontend

```bash
cd ../frontend

# Copy environment template
cp .env.example .env

# Edit .env if needed (defaults should work)
nano .env
```

**Default .env values:**
```bash
VITE_API_URL=http://localhost:3001
VITE_WS_URL=http://localhost:3001
```

## Step 5: Run the Application

### Option A: Run Both (Recommended)

```bash
# From project root
npm run dev
```

This runs both backend and frontend concurrently.

### Option B: Run Separately

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Step 6: Access the Application

Once running, open your browser:

- **Scorekeeper Interface:** http://localhost:5173/control
- **Admin Upload:** http://localhost:5173/admin
- **Overlay (Court 1):** http://localhost:5173/court/1

## Step 7: Test It Out

### Test Workflow

1. **Upload a Schedule:**
   - Go to http://localhost:5173/admin
   - Upload the `example-schedule.csv` file
   - Verify matches were created

2. **Use the Scorekeeper:**
   - Go to http://localhost:5173/control
   - Select "Court 1"
   - You should see "Spikers United" vs "Net Warriors"
   - Click + buttons to increment scores

3. **View the Overlay:**
   - Open http://localhost:5173/court/1 in another tab/window
   - The scores should update in real-time as you change them

4. **Test Set Win Logic:**
   - Increment Team A to 25 points
   - Increment Team B to 23 points
   - Add 2 more to Team A → Should trigger set win
   - Sets won should increment to 1-0
   - Scores should reset to 0-0
   - Set number should become 2

## Optional: Redis Setup

Redis is optional for local development but required for production scaling.

### Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Windows:**
Download from https://redis.io/download

### Verify Redis is Running

```bash
redis-cli ping
# Should respond: PONG
```

## Troubleshooting

### Backend won't start

**Error:** "Cannot connect to database"
- Verify your Supabase credentials in `backend/.env`
- Check that you ran the schema SQL script
- Test connection: https://YOUR_PROJECT.supabase.co

**Error:** "Redis connection failed"
- This is just a warning in development
- Backend will continue without Redis
- To fix: Install and start Redis (see above)

### Frontend won't connect to backend

**Error:** "WebSocket connection failed"
- Verify backend is running on port 3001
- Check `frontend/.env` has correct `VITE_API_URL`
- Check browser console for CORS errors

### No matches showing up

**Problem:** Selected a court but no team names appear
- Upload a schedule first via `/admin`
- Or manually create a match in Supabase dashboard
- Verify `courts.current_match_id` is set

### Scores not updating in real-time

**Problem:** Changes in control UI don't appear in overlay
- Open browser console (F12) and check for errors
- Verify WebSocket connection (should see "WebSocket connected")
- Check that both tabs are using the same court ID

## Development Tips

### Hot Reload

Both frontend and backend support hot reload:
- Frontend: Vite will auto-refresh on file changes
- Backend: tsx watch will restart server on file changes

### View Logs

**Backend logs:**
```bash
cd backend
npm run dev
# Logs appear in terminal
```

**Frontend logs:**
Open browser console (F12)

### Database Inspection

**Supabase:**
Go to Table Editor in Supabase dashboard

**Local PostgreSQL:**
```bash
psql volleyball_scoreboard

# View courts
SELECT * FROM courts LIMIT 10;

# View matches
SELECT * FROM matches;

# View score states
SELECT * FROM score_states;
```

## Next Steps

After local development works:

1. Read `DEPLOYMENT.md` for production deployment
2. Customize UI colors/branding in Tailwind config
3. Adjust volleyball rules (e.g., 5-set matches) in `backend/src/scoring.ts`
4. Add authentication for admin routes
5. Set up monitoring and alerts

## Need Help?

- Check `README.md` for API documentation
- Check `DEPLOYMENT.md` for production setup
- Open an issue on GitHub
- Review backend logs for error details

## Quick Reference

**Useful Commands:**

```bash
# Install everything
npm install && cd backend && npm install && cd ../frontend && npm install && cd ..

# Run both servers
npm run dev

# Reset court selection (in browser)
# Tap logo 5 times in control UI

# View all courts
curl http://localhost:3001/api/courts

# View current match for court 1
curl http://localhost:3001/api/court/1/currentMatch

# Health check
curl http://localhost:3001/health
```

**Port Reference:**
- Backend API: `http://localhost:3001`
- WebSocket: `ws://localhost:3001`
- Frontend: `http://localhost:5173`

---

Happy scoring! 🏐

