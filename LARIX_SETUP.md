# 📹 Larix Recording Integration Setup

This guide explains how to configure automatic Larix recording for your scoreboard system.

---

## 🎯 Overview

The system automatically:
- **Starts recording** when you press "Start Scoring Next Match"
- **Stops recording** when the match ends (best of 3 sets complete)

**No manual Larix control needed during the event!**

---

## ⚙️ Configuration

### 1. Railway Backend Environment Variables

Add these to your Railway backend environment variables:

```bash
LARIX_API_URL=http://YOUR_LARIX_DEVICE_IP:8080
LARIX_API_TOKEN=your_larix_api_token_here
```

### Example:
```bash
LARIX_API_URL=http://192.168.1.100:8080
LARIX_API_TOKEN=abc123def456ghi789
```

---

## 🔧 Getting Your Larix Configuration

### Step 1: Find Your Larix Device IP

**On the device running Larix:**

- **iOS:** Settings → Wi-Fi → Tap the (i) icon → Note the IP address
- **Android:** Settings → Wi-Fi → Tap your network → Note the IP address

### Step 2: Enable LarixTuner API

**In the Larix app:**

1. Open **Larix Broadcaster**
2. Go to **Settings**
3. Enable **LarixTuner** API
4. Set a port (default: 8080)
5. Create/copy your **API Token**

**Save this token!** You'll need it for `LARIX_API_TOKEN`.

---

## 🌐 Network Setup

### Option 1: Local Network (Recommended for Events)

Both devices (iPad with scoreboard + streaming device with Larix) must be on the **same Wi-Fi network**.

```bash
LARIX_API_URL=http://192.168.1.100:8080  # Local IP
```

✅ **Pros:** Fast, reliable, works offline  
❌ **Cons:** Only works on same network

### Option 2: Static IP / VPN (Advanced)

If you have a static IP or VPN:

```bash
LARIX_API_URL=https://your-larix-device.example.com
```

✅ **Pros:** Works from anywhere  
❌ **Cons:** Requires network setup

---

## 🧪 Testing the Connection

### Test from Railway Dashboard

Once you've added the environment variables, test the connection:

**API Endpoint:**
```
GET https://your-railway-backend.up.railway.app/api/admin/testLarix
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Larix API connection successful"
}
```

### Test from Browser

Open this URL in your browser:
```
https://your-railway-backend.up.railway.app/api/admin/testLarix
```

---

## 📱 How It Works

### Match Start
1. Operator presses **"Start Scoring Next Match"**
2. Backend calls Larix: `POST /api/v1/recorder/start`
3. Toast notification: **"📹 Recording started"**
4. Match proceeds normally

### During Match
- Score updates → No Larix calls
- Set transitions → No Larix calls
- Just normal scorekeeping

### Match End
1. Final set is won (2-0 or 2-1)
2. Operator presses **"Start Scoring Next Set"** (which completes the match)
3. Backend calls Larix: `POST /api/v1/recorder/stop`
4. Toast notification: **"🛑 Match complete - Recording stopped"**
5. Recording file saved in Larix

---

## 🚨 Error Handling

### If Larix API Fails

The system automatically:
1. **Retries 3 times** (with 500ms delay)
2. Shows a warning toast: **"⚠️ Recording not started: [reason]"**
3. **Scorekeeping continues normally** (never blocks your event)

### Common Issues

| Issue | Solution |
|-------|----------|
| "Unable to trigger recording on camera" | Check device IP and Wi-Fi connection |
| "Larix API not configured" | Add LARIX_API_URL and LARIX_API_TOKEN to Railway |
| "Connection timeout" | Ensure both devices are on same network |
| "Unauthorized" | Check LARIX_API_TOKEN is correct |

---

## 📋 Pre-Event Checklist

Before your tournament:

- [ ] Larix device on same Wi-Fi as iPads
- [ ] LarixTuner API enabled in Larix app
- [ ] Note device IP address
- [ ] Copy API token from Larix
- [ ] Add `LARIX_API_URL` to Railway
- [ ] Add `LARIX_API_TOKEN` to Railway
- [ ] Redeploy Railway backend
- [ ] Test connection: `/api/admin/testLarix`
- [ ] Test one full match: start → play → end
- [ ] Verify recording file saved in Larix

---

## 🔐 Security Notes

- **Never commit** `LARIX_API_TOKEN` to Git
- Store in Railway environment variables only
- Use local network when possible
- If using public URL, enable HTTPS

---

## 📚 Larix API Documentation

Official docs: [https://larixtuner.softvelum.com/api_info](https://larixtuner.softvelum.com/api_info)

---

## 💡 Tips

1. **Test before the event** - Run a full match simulation
2. **Keep Larix device plugged in** - Recording drains battery
3. **Use a dedicated Wi-Fi network** - Avoid public/congested networks
4. **Check storage** - Ensure Larix device has enough space
5. **Silent failures** - The scoreboard never blocks if Larix fails

---

## 🆘 Support

If you see warning toasts during your event:
- Scorekeeping still works fine
- Recording may not have started/stopped
- Manually check Larix device
- Network issues are most common cause

**The show must go on!** ✅

