# 🚀 Quick Deploy Checklist

Use this checklist when deploying via GitHub integrations.

## ✅ Pre-Deployment Checklist

- [ ] All code committed and pushed to GitHub
- [ ] Supabase database set up
- [ ] Have Supabase URL and service_role key ready
- [ ] Created Railway account (https://railway.app)
- [ ] Created Vercel account (https://vercel.com)

---

## 📦 Deploy Backend (Railway) - 5 minutes

1. [ ] Go to https://railway.app
2. [ ] Click "Deploy from GitHub repo"
3. [ ] Select `SV-Scoreboard-App`
4. [ ] Set **Root Directory** to: `backend`
5. [ ] Add environment variables (see ENV_VARIABLES.md):
   - [ ] `SUPABASE_URL`
   - [ ] `SUPABASE_KEY`
   - [ ] `PORT` = `3001`
   - [ ] `NODE_ENV` = `production`
6. [ ] Click Deploy
7. [ ] Copy the Railway URL (e.g., `https://your-app.up.railway.app`)

---

## 🎨 Deploy Frontend (Vercel) - 5 minutes

1. [ ] Go to https://vercel.com
2. [ ] Click "Add New Project"
3. [ ] Select `SV-Scoreboard-App`
4. [ ] Set **Root Directory** to: `frontend`
5. [ ] Verify settings:
   - [ ] Framework: Vite
   - [ ] Build Command: `npm run build`
   - [ ] Output Directory: `dist`
6. [ ] Add environment variables:
   - [ ] `VITE_API_URL` = Your Railway URL from above
   - [ ] `VITE_WS_URL` = Your Railway URL from above
7. [ ] Click Deploy
8. [ ] Copy the Vercel URL (e.g., `https://your-app.vercel.app`)

---

## 🔗 Final Step: Link Them Together

1. [ ] Go back to Railway
2. [ ] Add one more environment variable:
   - [ ] `FRONTEND_URL` = Your Vercel URL
3. [ ] Railway will auto-redeploy (wait 1 minute)

---

## ✨ Test Your Deployment

Test these URLs in your browser:

- [ ] **Backend Health:** `https://your-app.up.railway.app/health`
  - Should show: `{"status":"ok"}`

- [ ] **Frontend Admin:** `https://your-app.vercel.app/admin`
  - Should show the admin panel

- [ ] **Upload Schedule:** Upload a test CSV at admin panel
  - Should succeed without errors

- [ ] **Control Panel:** `https://your-app.vercel.app/court/1`
  - Should show court selection, then "Start Scoring Next Match"

- [ ] **Overlay:** `https://your-app.vercel.app/overlay/1`
  - Should show transparent scoreboard

---

## 🎯 You're Live!

### URLs to Share:

**Scorekeepers (Tablets):**
```
https://your-app.vercel.app/court/1
https://your-app.vercel.app/court/2
... (up to 70)
```

**Larix/OBS Overlays:**
```
https://your-app.vercel.app/overlay/1
https://your-app.vercel.app/overlay/2
... (up to 70)
```

**Admin Panel:**
```
https://your-app.vercel.app/admin
```

---

## 🔄 Auto-Deploy Setup

Both platforms now auto-deploy when you push to GitHub:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Railway and Vercel will automatically rebuild! 🎉

---

## 📚 Need More Help?

See `DEPLOYMENT_GUIDE.md` for detailed troubleshooting and setup instructions.

