# 📹 Larix Integration - Softvelum Cloud Setup

## 🎯 Overview

You're using **Softvelum's LarixTuner Cloud Service** at `https://larixtuner.softvelum.com` to manage your 70 Larix devices. This is the easiest setup because Softvelum handles the server infrastructure!

---

## 🔑 Step 1: Get Your API Credentials

### **Where to Find `client_id` and `api_key`**

1. **Log in to LarixTuner:**
   ```
   https://larixtuner.softvelum.com
   ```

2. **Find API Settings:**
   
   Look for one of these locations in the web interface:
   - **Account** → **Settings** → **API**
   - **Settings** ⚙️ → **API Credentials**
   - **Account** → **API Keys**
   - **Developer** → **API Settings**

3. **Copy Your Credentials:**
   
   You should see:
   ```
   Client ID: abc123def456ghi789
   API Key:   xyz789uvw012mno345
   ```
   
   **Copy both of these values!**

### **Alternative: Check the URL**

Try navigating directly to:
- `https://larixtuner.softvelum.com/account/api`
- `https://larixtuner.softvelum.com/settings/api`
- `https://larixtuner.softvelum.com/api-keys`

---

## 📱 Step 2: Get Device IDs

You're already on the right page! At:
```
https://larixtuner.softvelum.com/account/devices
```

You should see a list of your 70 connected Larix phones.

### **What to Look For:**

| Device Name | Device ID | Status |
|-------------|-----------|--------|
| Court 1 Phone | `668d111e83d3c488d1e91eeb` | Online |
| Court 2 Phone | `668d111e83d3c488d1e91eec` | Online |
| Court 3 Phone | `668d111e83d3c488d1e91eed` | Online |
| ... | ... | ... |

**The "Device ID" column** contains the unique IDs you need (like `668d111e83d3c488d1e91eeb`).

### **How to Export Device IDs:**

**Option A: Manual List**
- Write down or screenshot the device IDs
- Note which device corresponds to which court

**Option B: Browser Console (Advanced)**
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Run this to extract device IDs from the page:
   ```javascript
   // This might work depending on the page structure
   Array.from(document.querySelectorAll('tr')).map(row => {
     const cells = row.querySelectorAll('td');
     return cells.length > 1 ? cells[1].textContent : null;
   }).filter(id => id && id.length > 20);
   ```

---

## ⚙️ Step 3: Configure Railway

Add these **3 environment variables** to your Railway backend:

```bash
LARIX_API_URL=https://larixtuner.softvelum.com
LARIX_CLIENT_ID=your_client_id_here
LARIX_API_KEY=your_api_key_here
```

### **How to Add in Railway:**

1. Go to your Railway dashboard
2. Click your backend service
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add each one:
   - Name: `LARIX_API_URL`, Value: `https://larixtuner.softvelum.com`
   - Name: `LARIX_CLIENT_ID`, Value: (paste your client_id)
   - Name: `LARIX_API_KEY`, Value: (paste your api_key)
6. Click **Deploy**

---

## 🗄️ Step 4: Assign Device IDs to Courts

Run the database migration first:

### **A. Run Migration in Supabase:**

In **Supabase SQL Editor**, paste this:

```sql
-- Add device ID column to courts
ALTER TABLE courts ADD COLUMN IF NOT EXISTS larix_device_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_courts_larix_device_id ON courts(larix_device_id);
```

### **B. Assign Device IDs:**

You have several options:

#### **Option 1: Manual SQL (If you have a list)**

```sql
-- Replace with your actual device IDs from LarixTuner
UPDATE courts SET larix_device_id = '668d111e83d3c488d1e91eeb' WHERE id = 1;
UPDATE courts SET larix_device_id = '668d111e83d3c488d1e91eec' WHERE id = 2;
UPDATE courts SET larix_device_id = '668d111e83d3c488d1e91eed' WHERE id = 3;
-- ... continue for all 70 courts
```

#### **Option 2: Bulk via API**

```bash
# Set each court's device ID
curl -X POST https://your-backend.railway.app/api/admin/court/1/larixDevice \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "668d111e83d3c488d1e91eeb"}'
```

#### **Option 3: CSV Import (Future Feature)**

We can build an admin UI where you upload a CSV:
```
court_id,device_id
1,668d111e83d3c488d1e91eeb
2,668d111e83d3c488d1e91eec
3,668d111e83d3c488d1e91eed
...
```

---

## 🧪 Step 5: Test the Integration

### **1. Test API Configuration**

```bash
GET https://your-backend.railway.app/api/admin/testLarix
```

Expected response:
```json
{
  "success": true,
  "message": "Larix API connection successful"
}
```

### **2. View Court Device Assignments**

```bash
GET https://your-backend.railway.app/api/admin/courts/larixDevices
```

Expected response:
```json
[
  {
    "courtId": 1,
    "courtName": "Court 1",
    "larixDeviceId": "668d111e83d3c488d1e91eeb",
    "hasCurrentMatch": false
  },
  ...
]
```

### **3. Test a Full Match**

1. Upload a schedule with matches for Court 1
2. Start the match → Watch for:
   - Toast: **"📹 Recording started"**
   - Backend logs: `📹 [Court 1] Starting Larix recording for device "668d111e83d3c488d1e91eeb"`
3. Complete the match → Watch for:
   - Toast: **"🛑 Match complete - Recording stopped"**
   - Backend logs: `🛑 [Court 1] Stopping Larix recording for device "668d111e83d3c488d1e91eeb"`
4. Verify recording file appears on Court 1's phone

---

## 🔍 API Format Used

### **Start Recording:**
```
GET https://larixtuner.softvelum.com/api/v1/public/remote_control/[device_id]/broadcast/start?client_id=[client_id]&api_key=[api_key]
```

**Example:**
```bash
curl 'https://larixtuner.softvelum.com/api/v1/public/remote_control/668d111e83d3c488d1e91eeb/broadcast/start?client_id=abc123&api_key=xyz789'
```

**Response:**
```json
{
  "status": "ok"
}
```

### **Stop Recording:**
```
GET https://larixtuner.softvelum.com/api/v1/public/remote_control/[device_id]/broadcast/stop?client_id=[client_id]&api_key=[api_key]
```

---

## 📋 Pre-Event Checklist

- [ ] Log in to `https://larixtuner.softvelum.com`
- [ ] Find and copy your `client_id` (from Settings → API)
- [ ] Find and copy your `api_key` (from Settings → API)
- [ ] Export list of all 70 device IDs (from /account/devices)
- [ ] Note which device ID belongs to which court
- [ ] Run database migration in Supabase (add larix_device_id column)
- [ ] Add `LARIX_API_URL` to Railway (`https://larixtuner.softvelum.com`)
- [ ] Add `LARIX_CLIENT_ID` to Railway
- [ ] Add `LARIX_API_KEY` to Railway
- [ ] Deploy Railway backend (should happen automatically)
- [ ] Assign all 70 device IDs to courts (via SQL or API)
- [ ] Test connection: `/api/admin/testLarix`
- [ ] Test one full match on Court 1
- [ ] Verify recording appears on Court 1's phone

---

## 🚨 Troubleshooting

### **"Larix API not configured"**
**Fix:** Make sure all 3 environment variables are set in Railway:
- `LARIX_API_URL`
- `LARIX_CLIENT_ID`
- `LARIX_API_KEY`

### **"No device ID configured for this court"**
**Fix:** Assign device ID to that court:
```bash
curl -X POST https://your-backend.railway.app/api/admin/court/5/larixDevice \
  -H "Content-Type: application/json" \
  -d '{"deviceId": "668d111e83d3c488d1e91eeb"}'
```

### **"Recording not started"**
**Possible causes:**
1. Device is offline in LarixTuner
2. Device ID is incorrect
3. client_id or api_key is wrong
4. Device is not in "remote control" mode

**Check:**
- Go to `https://larixtuner.softvelum.com/account/devices`
- Verify device shows as "Online"
- Verify device ID matches what's in your database

### **Wrong court's phone records**
**Fix:** Device IDs are swapped in database
- Double-check device ID assignments
- Update with correct mapping

---

## 💡 Benefits of Softvelum Cloud

| Feature | Benefit |
|---------|---------|
| **No server setup** | Softvelum hosts everything |
| **Always accessible** | Cloud-based, not dependent on local network |
| **Centralized management** | One dashboard for 70 devices |
| **Simple API** | Clean GET requests with query params |
| **Reliability** | Professional hosting infrastructure |

---

## 📚 Official Documentation

- **Softvelum LarixTuner:** https://softvelum.com/larix/tuner/
- **API Documentation:** https://larixtuner.softvelum.com/api_info
- **Support:** support@softvelum.com

---

## 🎉 You're All Set!

Once configured, your scoreboard will automatically:
- ✅ Start recording on the correct phone when match starts
- ✅ Stop recording on that phone when match ends
- ✅ Work independently across all 70 courts
- ✅ Handle failures gracefully (scorekeeping continues)

**No manual Larix control needed during your event!** 🚀

