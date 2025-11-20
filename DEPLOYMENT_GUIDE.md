# 🚀 Deployment Guide - Railway + Vercel

This guide will walk you through deploying your scoreboard app to production using Railway (backend) and Vercel (frontend).

## 📋 Prerequisites

- ✅ Code pushed to GitHub repository (`SV-Scoreboard-App`)
- ✅ Supabase account with database already set up
- ✅ GitHub account
- 🆕 Railway account (sign up at https://railway.app)
- 🆕 Vercel account (sign up at https://vercel.com)

---

## 🎯 Deployment Overview

```
Frontend (Vercel)  ──→  Backend (Railway)  ──→  Database (Supabase)
```

**Total Cost:** Free tier should handle 1000+ concurrent users

---

## Part 1️⃣: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Click **"Start a New Project"**
3. Sign in with your **GitHub account**
4. Authorize Railway to access your repositories

### Step 2: Deploy from GitHub
1. Click **"Deploy from GitHub repo"**
2. Select **`SV-Scoreboard-App`** from the list
3. Railway will detect it's a Node.js project

### Step 3: Configure Root Directory
1. In Railway project settings, find **"Root Directory"**
2. Set it to: **`backend`**
3. This tells Railway where your backend code lives

### Step 4: Add Environment Variables
Click on **"Variables"** tab and add these:

| Variable Name | Value | Where to Find It |
|--------------|-------|------------------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API |
| `SUPABASE_KEY` | Your Supabase service role key | Supabase Dashboard → Project Settings → API → service_role key |
| `PORT` | `3001` | Just type 3001 |
| `NODE_ENV` | `production` | Just type production |

**⚠️ IMPORTANT:** Use the `service_role` key, NOT the `anon` key!

### Step 5: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. Once deployed, Railway will give you a URL like: `https://your-app.up.railway.app`

### Step 6: Copy Backend URL
1. Click on your deployment in Railway
2. Find the **"Domains"** section
3. Copy the full URL (e.g., `https://your-app.up.railway.app`)
4. **Save this URL** - you'll need it for Vercel!

---

## Part 2️⃣: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to https://vercel.com
2. Click **"Sign Up"**
3. Sign in with your **GitHub account**
4. Authorize Vercel to access your repositories

### Step 2: Create New Project
1. Click **"Add New Project"**
2. Select **`SV-Scoreboard-App`** from your repos
3. Click **"Import"**

### Step 3: Configure Build Settings
Vercel should auto-detect these, but verify:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### Step 4: Add Environment Variables
Click **"Environment Variables"** and add:

| Name | Value | Example |
|------|-------|---------|
| `VITE_API_URL` | Your Railway backend URL from Part 1 | `https://your-app.up.railway.app` |
| `VITE_WS_URL` | Same as VITE_API_URL | `https://your-app.up.railway.app` |

**⚠️ Make sure to use the EXACT Railway URL you copied in Part 1!**

### Step 5: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. Vercel will give you a URL like: `https://your-app.vercel.app`

### Step 6: Update Railway with Vercel URL (Optional but Recommended)
Go back to Railway and add:

| Variable Name | Value |
|--------------|-------|
| `FRONTEND_URL` | Your Vercel URL (e.g., `https://your-app.vercel.app`) |

Then redeploy Railway (it will restart automatically).

---

## Part 3️⃣: Test Your Deployment

### Test Backend Health Check
Open in browser:
```
https://your-app.up.railway.app/health
```
You should see: `{"status":"ok"}`

### Test Frontend
Open in browser:
```
https://your-app.vercel.app/admin
```
You should see the admin panel!

### Test Full Flow
1. Go to: `https://your-app.vercel.app/admin`
2. Upload a test schedule
3. Go to: `https://your-app.vercel.app/court/1`
4. Select Court 1 and click "Start Scoring Next Match"
5. Try incrementing scores
6. Open overlay: `https://your-app.vercel.app/overlay/1`

If all of this works, **you're live!** 🎉

---

## Part 4️⃣: URLs for Event Day

Once deployed, share these URLs:

### For Scorekeepers (Tablets)
```
Court 1:  https://your-app.vercel.app/court/1
Court 2:  https://your-app.vercel.app/court/2
Court 3:  https://your-app.vercel.app/court/3
... (up to Court 70)
```

### For Larix/OBS Overlays
```
Overlay 1: https://your-app.vercel.app/overlay/1
Overlay 2: https://your-app.vercel.app/overlay/2
... etc
```

### For Admin/Schedule Management
```
Admin: https://your-app.vercel.app/admin
```

---

## 🔧 Troubleshooting

### Backend won't deploy on Railway
- ✅ Check "Root Directory" is set to `backend`
- ✅ Verify all environment variables are set
- ✅ Check Railway logs for errors

### Frontend won't deploy on Vercel
- ✅ Check "Root Directory" is set to `frontend`
- ✅ Verify `VITE_API_URL` matches your Railway URL exactly
- ✅ Check Vercel deployment logs

### Scores not updating in real-time
- ✅ Make sure Railway backend is running (check Railway dashboard)
- ✅ Verify `VITE_WS_URL` is set correctly in Vercel
- ✅ Check browser console for WebSocket errors

### CORS Errors
- ✅ Add your Vercel URL to `FRONTEND_URL` in Railway
- ✅ Redeploy Railway backend after adding the variable

---

## 💰 Cost Breakdown

| Service | Free Tier | Estimated Cost |
|---------|-----------|----------------|
| **Supabase** | 500MB DB, 2GB transfer | FREE for your use case |
| **Railway** | $5 credit/month (~500 hours) | FREE for weekend events, $5-10/month for 24/7 |
| **Vercel** | 100GB bandwidth, unlimited requests | FREE for your use case |

**For a weekend tournament:** Entirely FREE! 🎉

---

## 🌐 Adding a Custom Domain (Optional)

### On Vercel (Frontend)
1. Buy a domain (Namecheap, GoDaddy, etc.) - ~$10-15/year
2. In Vercel Dashboard → Your Project → Settings → **Domains**
3. Add your domain (e.g., `scoreboard.yourdomain.com`)
4. Follow Vercel's DNS instructions
5. Wait 5-60 minutes for DNS propagation
6. Done! Now use `https://scoreboard.yourdomain.com/overlay/1`

### On Railway (Backend)
Railway also supports custom domains if you want:
1. In Railway project → Settings → **Domains**
2. Add your custom domain
3. Update DNS records as instructed

---

## 🔄 Updating Your App

Both Railway and Vercel auto-deploy when you push to GitHub:

1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```
3. Railway and Vercel will automatically rebuild and deploy!

---

## 📞 Support

If you run into issues:
- **Railway:** Check their docs at https://docs.railway.app
- **Vercel:** Check their docs at https://vercel.com/docs
- **This App:** Check Railway/Vercel deployment logs for errors

---

## ✅ Pre-Deployment Checklist

Before you start deploying, make sure:
- [x] All code is committed and pushed to GitHub
- [x] Supabase database is set up and accessible
- [x] You have your Supabase URL and service_role key ready
- [ ] Railway account created
- [ ] Vercel account created
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] Tested full scoring flow

---

**Ready to deploy? Follow Part 1️⃣ above!** 🚀

