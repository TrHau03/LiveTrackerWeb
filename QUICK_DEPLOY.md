# Quick Deploy Reference

## 🚀 Fastest Way to Deploy

### **Option 1: Render.com** (Recommended for this project)

```bash
# 1. Push to GitHub
git add .
git commit -m "feat: Fix deployment config with standalone mode"
git push origin main

# 2. Go to https://render.com/dashboard
# 3. Click "New" → "Web Service"
# 4. Select GitHub repo
# Render will auto-read render.yaml
# 5. Deploy!
```

**Result:** Live in ~2 minutes

---

### **Option 2: Vercel** (Easiest, Free tier available)

```bash
# 1. Push to GitHub
git push

# 2. Go to https://vercel.com/dashboard
# 3. Click "Add New" → "Project"
# 4. Import from GitHub
# 5. Deploy!
```

**Result:** Live in ~3 minutes

---

### **Option 3: Docker** (Full control)

```bash
# Build
docker build -t my-app:latest .

# Test locally
docker run -p 3000:3000 my-app:latest

# Push to Docker Hub / ECR / etc
docker tag my-app:latest username/my-app:latest
docker push username/my-app:latest

# Deploy to any cloud (AWS, GCP, Azure, DigitalOcean, etc)
```

---

## 📋 What Changed

| Component | Before | After | Why |
|-----------|--------|-------|-----|
| `output` | default | `standalone` | Supports dynamic routes + optimized |
| Build output | `.next/*` | `.next/standalone` | Server binary ready to run |
| Deployment | Static only | SSR + Dynamic | Can serve `/order/[id]` |
| Config file | N/A | `render.yaml` | Auto-deploy via Render |
| Docker | N/A | `Dockerfile` | Any cloud deployment |

---

## ✅ Verification Checklist

```bash
# 1. Build test
npm run build
# Check: ✓ Finished TypeScript
# Check: ├ ƒ /order/[id]  (Dynamic route)

# 2. Check standalone
ls .next/standalone/server.js
# Check: File exists

# 3. Start locally
node .next/standalone/server.js
# Check: Listening on port 3000

# 4. Test routes
curl http://localhost:3000/
curl http://localhost:3000/order/test-id
# Check: Both return 200
```

---

## 🔗 Useful Links

| Task | URL |
|------|-----|
| **Deploy to Render** | https://render.com/dashboard |
| **Deploy to Vercel** | https://vercel.com/dashboard |
| **Deployment Guide** | See `DEPLOYMENT_GUIDE.md` |
| **Build Output** | `.next/standalone/` |
| **Error Fix Details** | See `DEPLOYMENT_FIX.md` |

---

## 📝 Environment Setup (Production)

Create in deployment platform:

```env
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://your-api.com/api/v1
```

---

## ⚡ Performance Tips

1. **Enable CDN Caching**
   - Static pages (/) → Cache 1 day
   - Dynamic (/order/[id]) → Cache 5 min

2. **Monitor Metrics**
   - Render: Dashboard → Metrics
   - Vercel: Dashboard → Analytics
   - Docker: Use Prometheus/New Relic

3. **Scale Up if Needed**
   - Render: Upgrade plan
   - Vercel: Auto-scales (Hobby is free)
   - Docker: Run multiple containers + LB

---

## 🆘 Troubleshooting

| Error | Fix |
|-------|-----|
| `Output directory 'out' not found` | ✅ Fixed! (output: 'standalone') |
| Port 3000 already in use | `PORT=8080 npm start` |
| 404 on `/order/[id]` | Check `.next/standalone/server.js` exists |
| Build fails | Run `npm run build` locally first |
| Memory error | Increase Node allocation |

---

## 📞 Next Actions

1. ✅ Code is fixed and ready
2. 📤 Push to GitHub
3. 🚀 Deploy via Render or Vercel
4. 🧪 Test payment page: `https://your-domain/order/DH123`
5. ✅ Monitor deployment logs

---

**Status:** 🟢 **READY TO SHIP**
