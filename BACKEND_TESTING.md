# Backend Testing Guide - Simplified Scoreboard

This guide helps you test the backend after the simplified scoreboard migration.

## Prerequisites

1. **Database Migration**: Run the simplified scoreboard migration first:
   ```sql
   -- Run database/migration_simplified_scoreboard.sql in your Supabase SQL editor
   -- This will:
   --   - Drop matches, match_logs, score_states
   --   - Create court_score_states (one row per court)
   --   - Remove sportwrench_event_id, current_match_id, larix_device_id columns
   ```

2. **Backend Running**: Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

3. **Environment Variables**: Ensure `.env` has:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `FRONTEND_URL` (optional)

## Testing Checklist

### 1. Tournament CRUD Operations

#### Create Tournament
```bash
curl -X POST http://localhost:3001/api/tournaments \
  -H "Content-Type: application/json" \
  -d '{"label": "Winter Formal 2024", "courtCount": 20}'
```

**Expected**: Returns tournament object with `id`, `label`, `court_count: 20`, and 20 courts created.

#### List All Tournaments
```bash
curl http://localhost:3001/api/tournaments
```

#### Get Single Tournament
```bash
curl http://localhost:3001/api/tournaments/1
```

#### Update Tournament
```bash
curl -X PATCH http://localhost:3001/api/tournaments/1 \
  -H "Content-Type: application/json" \
  -d '{"label": "Winter Formal 2024 Updated"}'
```

#### Get Courts for Tournament
```bash
curl http://localhost:3001/api/tournaments/1/courts
```

**Expected**: Returns array of courts with `tournament_id`, `court_number`, `name`.

### 2. Tournament Label

#### Get Tournament Label
```bash
curl http://localhost:3001/api/tournaments/1/label
```

#### Set Tournament Label
```bash
curl -X POST http://localhost:3001/api/tournaments/1/label \
  -H "Content-Type: application/json" \
  -d '{"label": "New Label"}'
```

### 3. Score Operations (Left / Right)

Score state is per court. Sides are `left` and `right`.

#### Get Current Score for a Court
```bash
curl http://localhost:3001/api/score/current/1
```

**Expected**: `{ courtId, leftScore, rightScore, setsLeft, setsRight, setNumber, setHistory, updatedAt, pendingSetWin }` or 404.

#### Increment Score
```bash
curl -X POST http://localhost:3001/api/score/increment \
  -H "Content-Type: application/json" \
  -d '{"courtId": 1, "side": "left"}'
```

#### Decrement Score
```bash
curl -X POST http://localhost:3001/api/score/decrement \
  -H "Content-Type: application/json" \
  -d '{"courtId": 1, "side": "left"}'
```

#### Reset Set
```bash
curl -X POST http://localhost:3001/api/score/resetSet \
  -H "Content-Type: application/json" \
  -d '{"courtId": 1}'
```

#### Confirm Set Win
```bash
curl -X POST http://localhost:3001/api/score/confirmSetWin \
  -H "Content-Type: application/json" \
  -d '{"courtId": 1}'
```

#### Reset Game (start next game)
```bash
curl -X POST http://localhost:3001/api/score/resetGame \
  -H "Content-Type: application/json" \
  -d '{"courtId": 1}'
```

### 4. Court Score by Tournament and Court Number

```bash
curl http://localhost:3001/api/tournaments/1/courts/1/score
```

Replace `1/courts/1` with `tournamentId/courts/courtNumber`. Returns current score payload for that court.

### 5. Database Verification

```sql
-- Check tournaments
SELECT * FROM tournaments;

-- Check courts (tournament-scoped)
SELECT id, tournament_id, court_number, name FROM courts ORDER BY tournament_id, court_number;

-- Check court score states
SELECT * FROM court_score_states;
```

## Common Issues

- **"Court not found"**: Ensure court exists for that tournament: `GET /api/tournaments/:id/courts`
- **"Score state not found"**: First increment or reset will create state for that court.
