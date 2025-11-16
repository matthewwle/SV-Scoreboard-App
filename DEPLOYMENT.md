# Deployment Guide

Complete deployment guide for the Volleyball Scoreboard System.

## Table of Contents

1. [Database Setup (Supabase)](#database-setup)
2. [Backend Deployment (AWS ECS)](#backend-deployment)
3. [Frontend Deployment (Vercel)](#frontend-deployment)
4. [Redis Setup (ElastiCache)](#redis-setup)
5. [Environment Variables](#environment-variables)
6. [Monitoring & Scaling](#monitoring)

---

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose organization and region
4. Note your project URL and API keys

### 2. Run Database Schema

1. Open SQL Editor in Supabase dashboard
2. Copy contents of `database/schema.sql`
3. Execute the SQL script
4. Verify tables were created:
   - `courts`
   - `matches`
   - `score_states`

### 3. Configure Access

1. Go to Settings → API
2. Copy `URL` and `anon public` key
3. Save for backend environment variables

### Alternative: Self-hosted PostgreSQL

```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or
sudo apt install postgresql  # Ubuntu

# Create database
createdb volleyball_scoreboard

# Run schema
psql volleyball_scoreboard < database/schema.sql
```

---

## Backend Deployment (AWS ECS)

### Option 1: AWS ECS/Fargate

#### 1. Build and Push Docker Image

```bash
# Login to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

# Create ECR repository
aws ecr create-repository --repository-name scoreboard-backend

# Build image
cd backend
docker build -t scoreboard-backend .

# Tag image
docker tag scoreboard-backend:latest YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/scoreboard-backend:latest

# Push image
docker push YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/scoreboard-backend:latest
```

#### 2. Create ECS Cluster

```bash
aws ecs create-cluster --cluster-name scoreboard-cluster
```

#### 3. Create Task Definition

Create `task-definition.json`:

```json
{
  "family": "scoreboard-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "YOUR_AWS_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/scoreboard-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3001"
        },
        {
          "name": "REDIS_HOST",
          "value": "your-redis-endpoint.cache.amazonaws.com"
        },
        {
          "name": "REDIS_PORT",
          "value": "6379"
        },
        {
          "name": "FRONTEND_URL",
          "value": "https://your-app.vercel.app"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:SUPABASE_URL"
        },
        {
          "name": "SUPABASE_KEY",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:SUPABASE_KEY"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/scoreboard-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register task definition:
```bash
aws ecs register-task-definition --cli-input-json file://task-definition.json
```

#### 4. Create Application Load Balancer

1. Create ALB in AWS Console
2. Add listener on port 80 (or 443 for HTTPS)
3. Create target group (type: IP, port 3001)
4. Configure health check path: `/health`
5. Enable **sticky sessions** for WebSocket support

#### 5. Create ECS Service

```bash
aws ecs create-service \
  --cluster scoreboard-cluster \
  --service-name scoreboard-backend \
  --task-definition scoreboard-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=backend,containerPort=3001"
```

### Option 2: Heroku

```bash
# Install Heroku CLI
brew install heroku/brew/heroku

# Login
heroku login

# Create app
heroku create scoreboard-backend

# Set environment variables
heroku config:set SUPABASE_URL=your_url
heroku config:set SUPABASE_KEY=your_key
heroku config:set REDIS_HOST=your_redis_host

# Deploy
cd backend
git push heroku main
```

### Option 3: Railway

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Set root directory to `backend`
5. Add environment variables
6. Deploy

---

## Frontend Deployment (Vercel)

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Configure Project

Create `frontend/vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. Deploy

```bash
cd frontend
vercel

# Follow prompts
# Set project name: volleyball-scoreboard
# Select framework: Vite
```

### 4. Set Environment Variables

In Vercel Dashboard:
1. Go to Settings → Environment Variables
2. Add:
   - `VITE_API_URL` = `https://your-backend.amazonaws.com`
   - `VITE_WS_URL` = `https://your-backend.amazonaws.com`

### 5. Deploy Production

```bash
vercel --prod
```

### Alternative: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
cd frontend
netlify deploy --prod --dir=dist
```

---

## Redis Setup (AWS ElastiCache)

### 1. Create Redis Cluster

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id scoreboard-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --engine-version 7.0
```

### 2. Configure Security Group

1. Allow inbound traffic on port 6379
2. From ECS security group only
3. No public access

### 3. Get Endpoint

```bash
aws elasticache describe-cache-clusters \
  --cache-cluster-id scoreboard-redis \
  --show-cache-node-info
```

### 4. Update Backend Environment

Set `REDIS_HOST` to the endpoint from step 3.

### Alternative: Redis Cloud

1. Go to https://redis.com/try-free/
2. Create free database
3. Copy connection details
4. Update backend environment variables

---

## Environment Variables

### Backend

```bash
# Required
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_anon_key

# Redis
REDIS_HOST=your-redis-endpoint.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=  # if using password

# CORS
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend

```bash
VITE_API_URL=https://your-backend.amazonaws.com
VITE_WS_URL=https://your-backend.amazonaws.com
```

---

## Monitoring & Scaling

### CloudWatch Logs (AWS)

1. Enable CloudWatch logging in task definition
2. View logs in CloudWatch console
3. Set up alarms for errors

### Metrics to Monitor

- **WebSocket connections**: Should not exceed ~500
- **Response time**: Target <200ms for score updates
- **Error rate**: Should be <1%
- **CPU/Memory**: Scale up if >70% consistently

### Auto-scaling (ECS)

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/scoreboard-cluster/scoreboard-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/scoreboard-cluster/scoreboard-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### Health Checks

Backend exposes `/health` endpoint:

```bash
curl https://your-backend.com/health
# Response: {"status":"ok"}
```

---

## Testing Deployment

### 1. Test Backend API

```bash
curl https://your-backend.com/api/courts
```

### 2. Test WebSocket

```javascript
const socket = io('https://your-backend.com');
socket.on('connect', () => console.log('Connected!'));
socket.emit('joinCourt', 1);
```

### 3. Test Frontend

1. Open control UI: `https://your-app.vercel.app/control`
2. Select a court
3. Open overlay: `https://your-app.vercel.app/court/1`
4. Update scores and verify real-time updates

### 4. Test on Larix

1. Open Larix Broadcaster on iOS/Android
2. Add Browser Overlay
3. Enter URL: `https://your-app.vercel.app/court/1`
4. Start streaming and verify overlay appears

---

## Troubleshooting

### WebSocket not connecting through ALB

**Solution**: Enable sticky sessions on ALB target group

```bash
aws elbv2 modify-target-group-attributes \
  --target-group-arn YOUR_TG_ARN \
  --attributes Key=stickiness.enabled,Value=true Key=stickiness.type,Value=lb_cookie
```

### CORS errors

**Solution**: Verify `FRONTEND_URL` in backend matches your deployed frontend URL exactly (no trailing slash).

### Redis connection timeout

**Solution**: Check security group allows traffic from ECS tasks on port 6379.

### Database connection errors

**Solution**: Verify Supabase credentials and ensure IP allowlist includes "0.0.0.0/0" (or your ECS NAT gateway IPs).

---

## Cost Estimates (AWS)

- **ECS Fargate (2 tasks)**: ~$30/month
- **ALB**: ~$20/month
- **ElastiCache (t3.micro)**: ~$15/month
- **Data transfer**: ~$10/month
- **Total**: ~$75/month

**Cheaper alternatives**:
- Heroku: $7/month (Eco plan)
- Railway: $5/month
- Vercel: Free (Hobby plan)
- Supabase: Free tier available

---

## Backup & Recovery

### Database Backups

Supabase provides automatic daily backups. To create manual backup:

```bash
# Export data
pg_dump -h db.xxx.supabase.co -U postgres -d postgres > backup.sql

# Restore
psql -h db.xxx.supabase.co -U postgres -d postgres < backup.sql
```

### Redis Backups

ElastiCache provides automatic snapshots. Configure in console:
1. Go to ElastiCache cluster
2. Modify → Backup retention: 7 days
3. Preferred backup window: Off-peak hours

---

## Support

For deployment issues, consult:
- AWS documentation: https://docs.aws.amazon.com/ecs/
- Vercel documentation: https://vercel.com/docs
- Supabase documentation: https://supabase.com/docs

