# 📹 Larix Recording Integration - Device ID Setup

## 🎯 Architecture Overview

**Perfect for 70 courts with 70 phones!**

Instead of managing 70 different IP addresses, this system uses:
- ✅ **ONE** centralized LarixTuner server
- ✅ **ONE** API URL and token (stored in Railway)
- ✅ Each court gets a unique **device ID** (stored in database)
- ✅ API calls include the device ID to target the correct phone

```
┌─────────────────────────────────┐
│  Railway Backend (Cloud)        │
│  LARIX_API_URL (one server)     │
│  LARIX_API_TOKEN (one token)    │
└───────────┬─────────────────────┘
            │
            │ HTTP Request with device_id
            │
            ▼
┌─────────────────────────────────┐
│  LarixTuner Server              │
│  (Central control point)        │
└───────────┬─────────────────────┘
            │
            ├─→ Device "court1"  (Court 1's phone)
            ├─→ Device "court2"  (Court 2's phone)
            ├─→ Device "court3"  (Court 3's phone)
            │   ...
            └─→ Device "court70" (Court 70's phone)
```

---

## ⚙️ Setup Instructions

### Step 1: Set Up LarixTuner Server

You need ONE LarixTuner instance that all 70 phones connect to.

**Options:**
1. **Run LarixTuner on a dedicated computer** at your venue
2. **Run LarixTuner in the cloud** (if you have a VPS/server)
3. **Run LarixTuner on one of the streaming phones** (if Larix supports this)

### Step 2: Configure Railway Environment Variables

Add these to your **Railway backend**:

```bash
LARIX_API_URL=http://YOUR_LARIXTUNER_SERVER_IP:8080
LARIX_API_TOKEN=your_centralized_api_token
```

**Example:**
```bash
LARIX_API_URL=http://192.168.1.50:8080
LARIX_API_TOKEN=master_token_abc123
```

### Step 3: Get Device IDs from Larix

Each of your 70 phones running Larix needs a unique identifier.

**Possible device ID formats:**
- **Simple names:** `court1`, `court2`, ... `court70`
- **Device names:** `device_1`, `device_2`, ... `device_70`
- **MAC addresses:** `AA:BB:CC:DD:EE:FF`
- **Serial numbers:** Whatever Larix uses internally

**How to find the device ID:**
1. Open Larix app on each phone
2. Go to Settings → Device Info
3. Look for "Device ID", "Device Name", or "Client ID"
4. Note this down for each court

---

## 📝 Assign Device IDs to Courts

### Option A: Use Supabase SQL Editor

Run this in your Supabase SQL Editor:

```sql
-- Assign device IDs to courts
UPDATE courts SET larix_device_id = 'court1' WHERE id = 1;
UPDATE courts SET larix_device_id = 'court2' WHERE id = 2;
UPDATE courts SET larix_device_id = 'court3' WHERE id = 3;
-- ... repeat for all 70 courts
```

**Or use a pattern if your device IDs follow a convention:**

```sql
-- If device IDs are "court1", "court2", etc.
UPDATE courts SET larix_device_id = 'court' || id WHERE id BETWEEN 1 AND 70;

-- If device IDs are "device_1", "device_2", etc.
UPDATE courts SET larix_device_id = 'device_' || id WHERE id BETWEEN 1 AND 70;
```

### Option B: Use the Admin API

Call this endpoint for each court:

```bash
POST https://your-backend.railway.app/api/admin/court/1/larixDevice
Content-Type: application/json

{
  "deviceId": "court1"
}
```

**Bulk assignment script** (run in terminal):

```bash
# Assign device IDs to courts 1-70
for i in {1..70}; do
  curl -X POST https://your-backend.railway.app/api/admin/court/$i/larixDevice \
    -H "Content-Type: application/json" \
    -d "{\"deviceId\": \"court$i\"}"
done
```

### Option C: Build an Admin UI (Future Enhancement)

We can add a UI in the admin panel where you can:
- See all 70 courts
- Input the device ID for each court
- Save in bulk

---

## 🧪 Testing

### 1. Test LarixTuner Connection

```bash
GET https://your-backend.railway.app/api/admin/testLarix
```

Expected:
```json
{
  "success": true,
  "message": "Larix API connection successful"
}
```

### 2. View All Court Device Assignments

```bash
GET https://your-backend.railway.app/api/admin/courts/larixDevices
```

Expected:
```json
[
  {
    "courtId": 1,
    "courtName": "Court 1",
    "larixDeviceId": "court1",
    "hasCurrentMatch": false
  },
  {
    "courtId": 2,
    "courtName": "Court 2",
    "larixDeviceId": "court2",
    "hasCurrentMatch": false
  }
  // ... all 70 courts
]
```

### 3. Test Match Start/Stop

1. Upload schedule for Court 1
2. Start a match → Check logs for: `📹 [Court 1] Starting Larix recording for device "court1"`
3. Complete the match → Check logs for: `🛑 [Court 1] Stopping Larix recording for device "court1"`
4. Verify recording file on the phone assigned to Court 1

---

## 📋 Database Schema

The migration adds one column to the `courts` table:

```sql
ALTER TABLE courts ADD COLUMN larix_device_id VARCHAR(100);
```

**Run the migration:**

In Supabase SQL Editor, paste the contents of:
```
database/migration_add_larix_device_id.sql
```

---

## 🔄 API Payload

When a match starts, the backend sends:

```json
POST {LARIX_API_URL}/api/v1/recorder/start
Authorization: Bearer {LARIX_API_TOKEN}
Content-Type: application/json

{
  "device_id": "court5",
  "court_id": 5,
  "match_id": 123,
  "timestamp": "2025-12-01T18:30:00.000Z"
}
```

The LarixTuner server uses `device_id` to route the command to the correct phone.

---

## ✅ Benefits of This Approach

| Feature | Device ID Approach | 70 Separate URLs Approach |
|---------|-------------------|---------------------------|
| Configuration | 1 URL + 1 Token | 70 URLs + 70 Tokens |
| Scalability | ✅ Easy to add courts | ❌ Complex |
| Maintenance | ✅ Central management | ❌ Per-device updates |
| Network Changes | ✅ No impact if IPs change | ❌ Must update all IPs |
| Setup Time | ✅ Minutes | ❌ Hours |

---

## 🚨 Troubleshooting

### "No device ID configured for this court"
- Check database: `SELECT id, larix_device_id FROM courts WHERE id = 1;`
- Assign device ID using the API or SQL

### "Larix API not configured"
- Add `LARIX_API_URL` and `LARIX_API_TOKEN` to Railway
- Redeploy backend

### "Recording not started"
- Verify device ID matches what Larix expects
- Check LarixTuner server is running and accessible
- Ensure phone is connected to LarixTuner

### Wrong court's phone starts recording
- Device IDs might be swapped
- Double-check device assignments in database

---

## 📱 Pre-Event Checklist

- [ ] LarixTuner server running and accessible
- [ ] All 70 phones connected to LarixTuner
- [ ] Note each phone's device ID (from Larix app)
- [ ] Run database migration to add `larix_device_id` column
- [ ] Assign device IDs to all 70 courts (via SQL or API)
- [ ] Add `LARIX_API_URL` to Railway
- [ ] Add `LARIX_API_TOKEN` to Railway
- [ ] Redeploy Railway backend
- [ ] Test `/api/admin/testLarix` endpoint
- [ ] Test one full match (start → end) on Court 1
- [ ] Verify recording appears on Court 1's phone

---

## 🎉 Result

Once configured, operators just need to:
1. Press **"Start Scoring Next Match"** → Recording auto-starts on correct phone
2. Score the match normally
3. When match ends → Recording auto-stops on that phone

**No manual Larix control needed! All 70 courts work independently!** ✅

---

## 🔗 Related Docs

- `LARIX_QUICK_START.md` - Simple setup guide
- `LARIX_SETUP.md` - Detailed documentation
- `database/migration_add_larix_device_id.sql` - Database migration

