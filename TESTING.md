# Testing Guide

Comprehensive testing instructions for the Volleyball Scoreboard System.

## Table of Contents

1. [Unit Testing](#unit-testing)
2. [Integration Testing](#integration-testing)
3. [Manual Testing](#manual-testing)
4. [Performance Testing](#performance-testing)
5. [Browser Compatibility](#browser-compatibility)

---

## Manual Testing

### Test Checklist

#### 1. Initial Setup
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Database connection successful
- [ ] Redis connection successful (or warning shown)
- [ ] Health check endpoint returns 200

#### 2. Admin - Schedule Upload
- [ ] Navigate to `/admin`
- [ ] Select `example-schedule.csv`
- [ ] Upload succeeds
- [ ] Success message shows matches created
- [ ] Verify courts have been assigned matches

#### 3. Control UI - Court Selection
- [ ] Navigate to `/control`
- [ ] "Select Court" modal appears
- [ ] Grid of 120 courts displayed
- [ ] Click "Court 1"
- [ ] Court selection saved (check localStorage)
- [ ] Team names loaded from uploaded schedule

#### 4. Control UI - Scoring
- [ ] Click "+" on Team A
- [ ] Score increments to 1
- [ ] Click "+" multiple times
- [ ] Score counts up correctly
- [ ] Click "−" on Team A
- [ ] Score decrements (doesn't go below 0)

#### 5. Set Win Logic - Basic
- [ ] Increment Team A to 24
- [ ] Increment Team B to 22
- [ ] Increment Team A to 25
- [ ] Set win triggers (2-point lead)
- [ ] Sets won: Team A = 1, Team B = 0
- [ ] Scores reset to 0-0
- [ ] Set number changes to 2

#### 6. Set Win Logic - Deuce
- [ ] Increment both teams to 24-24
- [ ] Increment Team A to 25
- [ ] Score should be 25-24 (no set win yet)
- [ ] Increment Team A to 26
- [ ] Set win triggers (26-24, win by 2)
- [ ] Scores reset to 0-0

#### 7. Match Win Logic
- [ ] Team A wins Set 1 (25-20)
- [ ] Team A wins Set 2 (25-22)
- [ ] Match complete (best of 3)
- [ ] Final score: Team A 2-0

#### 8. Reset Set
- [ ] Increment scores to 15-12
- [ ] Click "Reset Set"
- [ ] Confirm dialog appears
- [ ] Click OK
- [ ] Scores reset to 0-0
- [ ] Set number unchanged
- [ ] Sets won unchanged

#### 9. Swap Sides
- [ ] Team A = "Spikers United", Score: 10
- [ ] Team B = "Net Warriors", Score: 8
- [ ] Click "Swap Sides"
- [ ] Confirm dialog appears
- [ ] Click OK
- [ ] Team A now = "Net Warriors", Score: 8
- [ ] Team B now = "Spikers United", Score: 10
- [ ] Sets won also swapped

#### 10. Overlay UI - Display
- [ ] Open `/court/1` in new tab
- [ ] Team names visible
- [ ] Scores display correctly (matching control UI)
- [ ] Sets won displayed as circles
- [ ] Set number shown at top
- [ ] Background is dark/transparent

#### 11. Real-time Updates
- [ ] Open control UI in Tab 1
- [ ] Open overlay UI in Tab 2 (same court)
- [ ] Increment score in Tab 1
- [ ] Tab 2 updates within <200ms
- [ ] No page refresh needed
- [ ] Updates are smooth

#### 12. WebSocket Reconnection
- [ ] Open control UI
- [ ] Stop backend server
- [ ] Try incrementing score (should fail)
- [ ] Restart backend server
- [ ] WebSocket reconnects automatically
- [ ] Green connection indicator shows
- [ ] Increment score (should work)

#### 13. Court Selection Reset
- [ ] Open control UI (court already selected)
- [ ] Tap logo 5 times quickly
- [ ] Alert: "Court selection reset!"
- [ ] Court selection modal reappears
- [ ] localStorage cleared
- [ ] Can select new court

#### 14. Multi-Court Isolation
- [ ] Open `/control` in Tab 1, select Court 1
- [ ] Open `/control` in Tab 2, select Court 2
- [ ] Increment score in Tab 1
- [ ] Verify Tab 2 unchanged (isolated)
- [ ] Open `/court/1` in Tab 3
- [ ] Verify only Court 1 updates shown

#### 15. Larix Integration Test
- [ ] Open Larix Broadcaster app (iOS/Android)
- [ ] Settings → Overlay → Browser Overlay
- [ ] Enter URL: `https://your-app.com/court/1`
- [ ] Start camera preview
- [ ] Overlay appears on camera feed
- [ ] Update scores via control UI
- [ ] Overlay updates in real-time
- [ ] Start streaming
- [ ] Verify overlay visible in stream

---

## Performance Testing

### Load Testing with Artillery

Install Artillery:
```bash
npm install -g artillery
```

Create `load-test.yml`:
```yaml
config:
  target: "http://localhost:3001"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
  processor: "./test-functions.js"

scenarios:
  - name: "Score updates"
    flow:
      - post:
          url: "/api/score/increment"
          json:
            courtId: 1
            team: "A"
      - think: 1
```

Run test:
```bash
artillery run load-test.yml
```

Expected results:
- p95 latency < 500ms
- p99 latency < 1000ms
- Error rate < 1%

### WebSocket Load Test

Create `ws-load-test.js`:
```javascript
const io = require('socket.io-client');

const COURTS = 120;
const CONNECTIONS_PER_COURT = 3;

console.log(`Creating ${COURTS * CONNECTIONS_PER_COURT} connections...`);

for (let court = 1; court <= COURTS; court++) {
  for (let i = 0; i < CONNECTIONS_PER_COURT; i++) {
    const socket = io('http://localhost:3001');
    
    socket.on('connect', () => {
      socket.emit('joinCourt', court);
    });
    
    socket.on('score:update', (payload) => {
      // Measure latency
      const latency = Date.now() - new Date(payload.updatedAt).getTime();
      if (latency > 200) {
        console.warn(`High latency: ${latency}ms for court ${court}`);
      }
    });
  }
}

console.log('All connections established');
```

Run:
```bash
node ws-load-test.js
```

Monitor backend logs for connection count.

---

## Browser Compatibility

### Desktop Browsers

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Safari | 14+ | ✅ Fully supported |
| Edge | 90+ | ✅ Fully supported |

### Mobile Browsers

| Browser | Version | Status |
|---------|---------|--------|
| iOS Safari | 14+ | ✅ Fully supported |
| Chrome Android | 90+ | ✅ Fully supported |
| Samsung Internet | 14+ | ✅ Fully supported |

### Streaming Apps

| App | Platform | Status |
|-----|----------|--------|
| Larix Broadcaster | iOS | ✅ Tested, works |
| Larix Broadcaster | Android | ✅ Tested, works |
| OBS Studio | Desktop | ✅ Works (Browser Source) |
| StreamLabs | Desktop | ✅ Works (Browser Source) |

---

## Automated Testing (Future)

### Unit Tests (Jest)

```typescript
// backend/src/__tests__/scoring.test.ts
import { checkSetWin } from '../scoring';

describe('Volleyball Set Logic', () => {
  test('Team A wins at 25-23', () => {
    expect(checkSetWin(25, 23)).toBe('A');
  });

  test('No winner at 24-24', () => {
    expect(checkSetWin(24, 24)).toBe(null);
  });

  test('No winner at 25-24 (need win by 2)', () => {
    expect(checkSetWin(25, 24)).toBe(null);
  });

  test('Team B wins at 26-24', () => {
    expect(checkSetWin(24, 26)).toBe('B');
  });

  test('Team A wins extended set 30-28', () => {
    expect(checkSetWin(30, 28)).toBe('A');
  });
});
```

### E2E Tests (Playwright)

```typescript
// frontend/tests/e2e/scoring.spec.ts
import { test, expect } from '@playwright/test';

test('score increment updates overlay in real-time', async ({ page, context }) => {
  // Open control UI
  const controlPage = await context.newPage();
  await controlPage.goto('http://localhost:5173/control');
  await controlPage.click('text=1'); // Select court 1
  
  // Open overlay UI
  const overlayPage = await context.newPage();
  await overlayPage.goto('http://localhost:5173/court/1');
  
  // Wait for WebSocket connection
  await controlPage.waitForSelector('.bg-green-500'); // Connection indicator
  
  // Get initial score
  const initialScore = await overlayPage.textContent('[data-test="team-a-score"]');
  expect(initialScore).toBe('0');
  
  // Increment score
  await controlPage.click('[data-test="team-a-increment"]');
  
  // Verify overlay updates
  await overlayPage.waitForSelector('[data-test="team-a-score"]:has-text("1")');
  const newScore = await overlayPage.textContent('[data-test="team-a-score"]');
  expect(newScore).toBe('1');
});
```

---

## Troubleshooting Tests

### Test Fails: WebSocket not connecting

**Cause:** Backend not running or wrong URL

**Solution:**
```bash
# Verify backend is running
curl http://localhost:3001/health

# Check frontend .env
cat frontend/.env
# Should have: VITE_WS_URL=http://localhost:3001
```

### Test Fails: Scores not updating

**Cause:** No match assigned to court

**Solution:**
```bash
# Upload a schedule first
curl -X POST http://localhost:3001/api/admin/uploadSchedule \
  -F "file=@example-schedule.csv"

# Or manually assign a match
curl -X POST http://localhost:3001/api/court/1/overrideMatch \
  -H "Content-Type: application/json" \
  -d '{"matchId": 1}'
```

### Test Fails: Set logic incorrect

**Cause:** Score state not initialized

**Solution:**
```sql
-- Check score_states table
SELECT * FROM score_states WHERE match_id = 1;

-- If missing, increment score once to initialize
curl -X POST http://localhost:3001/api/score/increment \
  -H "Content-Type: application/json" \
  -d '{"courtId": 1, "team": "A"}'
```

---

## Test Coverage Goals

- [ ] Backend API routes: 80%+
- [ ] Scoring logic: 100%
- [ ] Database operations: 70%+
- [ ] Frontend components: 60%+
- [ ] E2E critical paths: 100%

---

## CI/CD Testing Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm install
          cd backend && npm install
          cd ../frontend && npm install
      
      - name: Setup database
        run: |
          psql -h localhost -U postgres -f database/schema.sql
        env:
          PGPASSWORD: postgres
      
      - name: Run backend tests
        run: cd backend && npm test
        env:
          SUPABASE_URL: http://localhost:54321
          SUPABASE_KEY: test_key
          REDIS_HOST: localhost
      
      - name: Run frontend tests
        run: cd frontend && npm test
      
      - name: Build
        run: |
          cd backend && npm run build
          cd ../frontend && npm run build
```

---

## Sign-off Criteria

Before deploying to production:

✅ All manual tests pass
✅ Load test shows <200ms p95 latency
✅ 360 concurrent WebSocket connections stable
✅ No memory leaks after 1 hour
✅ Browser compatibility verified
✅ Larix integration tested
✅ Database backups configured
✅ Monitoring dashboards set up

---

Happy testing! 🧪

