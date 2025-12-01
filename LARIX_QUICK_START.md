# 📹 Larix Integration - Quick Start

## ⚡ 5-Minute Setup

### Step 1: Get Your Larix Info

**On your Larix streaming device:**

1. Open **Larix Broadcaster** app
2. Go to **Settings** → Enable **LarixTuner**
3. Copy the **API Token** (looks like: `abc123def456`)
4. Note the **Port** (usually `8080`)

**Find device IP:**
- iOS: Settings → Wi-Fi → Tap (i) → IP Address
- Android: Settings → Wi-Fi → Tap network → IP Address

---

### Step 2: Add to Railway

Go to your Railway dashboard and add these **environment variables**:

```bash
LARIX_API_URL=http://YOUR_DEVICE_IP:8080
LARIX_API_TOKEN=your_token_from_larix_app
```

**Example:**
```bash
LARIX_API_URL=http://192.168.1.100:8080
LARIX_API_TOKEN=abc123def456ghi789
```

**Click "Deploy"** to restart your backend.

---

### Step 3: Test It

Open this URL in your browser:
```
https://your-railway-backend.up.railway.app/api/admin/testLarix
```

✅ **Success:** `{"success": true, "message": "Larix API connection successful"}`  
❌ **Failed:** Check IP, token, and that both devices are on same Wi-Fi

---

## 🎮 How to Use

### Normal Operation

1. **Press "Start Scoring Next Match"**  
   → You'll see: **"📹 Recording started"**

2. **Play the match normally**  
   → Score points, complete sets

3. **When match ends (2 sets won)**  
   → You'll see: **"🛑 Match complete - Recording stopped"**

**That's it!** No manual Larix control needed.

---

## 🚨 Troubleshooting

### "⚠️ Recording not started"

**Quick fixes:**
- ✅ Both devices on same Wi-Fi
- ✅ Check IP address is correct
- ✅ LarixTuner enabled in Larix app
- ✅ API token is correct

**Important:** Scorekeeping still works! Recording just won't be automatic.

---

## 📱 What Gets Recorded

- ✅ **Starts:** When you press "Start Scoring Next Match"
- ✅ **Stops:** When match ends (best of 3 complete)
- ❌ **NOT recorded:** Set transitions, warmups, pauses

---

## 💡 Pro Tips

1. **Test before your event** - Run one full match
2. **Keep Larix plugged in** - Recording drains battery
3. **Stable Wi-Fi** - Dedicated network is best
4. **Check storage** - Make sure device has space

---

## 📞 Need Help?

See full documentation: `LARIX_SETUP.md`

---

**Your scoreboard is now equipped with automatic recording! 🎉**

