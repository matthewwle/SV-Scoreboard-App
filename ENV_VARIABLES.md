# Environment Variables Reference

## Backend (Railway)

Set these in Railway Dashboard → Variables:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `SUPABASE_URL` | Your Supabase project URL | `https://abcdefgh.supabase.co` | ✅ Yes |
| `SUPABASE_KEY` | Supabase service_role key | `eyJhbGc...` | ✅ Yes |
| `PORT` | Server port | `3001` | ✅ Yes |
| `NODE_ENV` | Environment | `production` | ✅ Yes |
| `FRONTEND_URL` | Your Vercel URL | `https://your-app.vercel.app` | Recommended |
| `REDIS_URL` | Redis connection string | (optional) | No |

## Frontend (Vercel)

Set these in Vercel Dashboard → Environment Variables:

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `VITE_API_URL` | Railway backend URL | `https://your-app.up.railway.app` | ✅ Yes |
| `VITE_WS_URL` | Railway backend URL (same as API) | `https://your-app.up.railway.app` | ✅ Yes |

## Local Development

For local development, create `backend/.env`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

Frontend uses defaults in `config.ts` (no .env needed locally).

## Where to Find Values

### Supabase URL & Key
1. Go to https://app.supabase.com
2. Select your project
3. Settings → API
4. Copy `URL` and `service_role` key (NOT the anon key!)

### Railway Backend URL
- Deploy backend first
- Find it in Railway Dashboard → Your Project → Domains
- Format: `https://your-app.up.railway.app`

### Vercel Frontend URL
- Deploy frontend first
- Find it in Vercel Dashboard → Your Project → Domains
- Format: `https://your-app.vercel.app`

