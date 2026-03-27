# Deployment Guide - Live Tracker Web

## Current Configuration

- **Build Mode:** Next.js Standalone
- **Node Runtime:** Node.js 22+
- **Framework:** Next.js 16.2.1 with Server-Side Rendering (SSR)
- **Port:** 3000

## Deployment Options

### Option 1: Render.com (Recommended)

1. **Connect Repository**
   - Go to https://render.com
   - Click "New" → "Web Service"
   - Connect GitHub repository

2. **Configuration**
   - Name: `live-tracker-web`
   - Environment: `Node`
   - Build Command: `npm run build`
   - Start Command: `node .next/standalone/server.js`
   - Plan: Free/Paid (as needed)

3. **Environment Variables** (if needed)
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_SITE_URL`: Your deployed URL
   - Any API endpoints

4. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy on git push

**Note:** Render automatically reads `render.yaml` if present in root.

### Option 2: Vercel (Easiest for Next.js)

1. Go to https://vercel.com
2. Click "New Project"
3. Import GitHub repository
4. Configure:
   - Framework: Next.js
   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
5. Deploy!

**Vercel Advantages:**
- Automatic Next.js optimization
- Edge functions support
- Built-in CDN
- Serverless functions

### Option 3: Docker + Any Cloud Provider

#### Build Docker Image
```bash
docker build -t live-tracker-web:latest .
```

#### Run Locally
```bash
docker run -p 3000:3000 live-tracker-web:latest
```

#### Deploy to:
- **AWS ECS/Fargate**
- **Google Cloud Run**
- **Azure Container Instances**
- **DigitalOcean App Platform**
- **Heroku** (with Docker support)

Example Docker Run:
```bash
docker run \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e PORT=3000 \
  live-tracker-web:latest
```

### Option 4: Traditional Node.js Server

1. **Build Locally**
   ```bash
   npm run build
   ```

2. **Copy to Server**
   ```bash
   .next/standalone/     # Main application
   .next/static/         # Static assets
   public/               # Public files
   package.json
   node_modules/         # Or run npm ci on server
   ```

3. **Start Server**
   ```bash
   NODE_ENV=production PORT=3000 node .next/standalone/server.js
   ```

## Key Features of Standalone Mode

✅ **Optimized Bundle** - Only runtime files needed
✅ **No node_modules Required** - Self-contained
✅ **Server-Side Rendering** - Supports dynamic routes like `/order/[id]`
✅ **Faster Deployment** - Smaller artifact size
✅ **Production Ready** - Built-in optimization

## Environment Variables

Set in deployment platform:

```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Optional: Backend API Configuration
NEXT_PUBLIC_API_URL=https://api.example.com
```

## Monitoring & Logs

### Render.com
- View logs in Render dashboard
- Auto-restart on crash
- Health check every 30s

### Vercel
- Real-time logs in CLI/Dashboard
- Analytics and performance metrics
- Serverless function monitoring

### Docker
```bash
docker logs <container-id>
docker stats <container-id>
```

## Troubleshooting

### Error: "Output directory 'out' not found"
**Solution:** Ensure `next.config.ts` has `output: 'standalone'`

### Port Already in Use
```bash
# Change port
PORT=8080 node .next/standalone/server.js
```

### Memory Issues
```bash
# Increase Node.js memory limit
NODE_OPTIONS=--max-old-space-size=2048 node .next/standalone/server.js
```

### 404 on Dynamic Routes
**Ensure:** Dynamic routes use server-rendering (not static export)
- ✅ `/order/[id]` → Server-rendered on demand
- Check build output: `ƒ (Dynamic)` marker

## Performance Optimization

1. **Enable Caching on CDN**
   - Static pages (/) → cache indefinitely
   - Dynamic routes (/order/[id]) → cache 60s

2. **Monitor Bundle Size**
   ```bash
   npm run build
   # Check .next/standalone size
   ```

3. **Enable Gzip Compression**
   - Most platforms do this automatically
   - Verify in response headers

## Rollback Strategy

1. **Render.com**
   - Previous builds available in dashboard
   - One-click rollback

2. **Vercel**
   - Automatic preview deployments
   - Easy rollback via CLI/Dashboard

3. **Docker**
   - Keep image tags: `v1.0`, `v1.1`, etc.
   - Roll back with: `docker pull live-tracker-web:v1.0`

## Database & API Integration

If backend API needed:
```typescript
// Example: lib/order-client.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.example.com';
```

Set `NEXT_PUBLIC_API_URL` in deployment platform environment variables.

## Security Checklist

- [ ] Environment variables properly set
- [ ] HTTPS enabled
- [ ] CORS headers configured
- [ ] API rate limiting enabled
- [ ] Regular security updates

## Deployment Checklist

Before deploying:

- [ ] `npm run build` passes locally
- [ ] No TypeScript errors
- [ ] `.next/standalone` folder created
- [ ] Environment variables documented
- [ ] Health check endpoint working
- [ ] Test dynamic routes (`/order/test-id`)
- [ ] Backend API accessible

## Support Links

- **Next.js Deployment:** https://nextjs.org/docs/app/building-your-application/deploying
- **Render.com:** https://render.com/docs
- **Vercel:** https://vercel.com/docs
- **Docker:** https://docs.docker.com

---

**Last Updated:** 28/03/2026  
**Build Output:** `.next/standalone` (Server-Side Rendering)
