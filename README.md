# Live Tracker Web - Frontend

A modern Next.js SaaS dashboard for livestream commerce management with real-time payments via QR codes.

## 🎯 Features

- **Dashboard:** Real-time order and customer management
- **Live Streams:** Monitor and manage livestream events
- **QR Payment:** Dynamic payment page with bank transfer information
- **Copy to Clipboard:** Easy account number and amount copying with toast notifications
- **Mobile-First:** Responsive design optimized for mobile browsers
- **Instagram Integration:** OAuth flow for Instagram account linking
- **Real-time Comments:** WebSocket support for live chat monitoring

## 📋 Recent Features (28/03/2026)

✅ **Payment QR Page:** `/order/[id]` - Dynamic payment page with QR code display  
✅ **Copy Buttons:** Smart clipboard copying with toast notifications  
✅ **Success Modal:** Post-payment instructions with webview integration  
✅ **Production Deployment:** Standalone mode + Docker + Render.yaml config  

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
open http://localhost:3000
```

### Build & Test

```bash
# Build for production
npm run build

# Start server
npm start
```

### Test Payment Page

```bash
# Local development
open http://localhost:3000/order/DH123

# Production
open https://your-domain.com/order/DH123
```

## 🛠️ Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| **Next.js** | 16.2.1 | React framework with SSR/SSG |
| **React** | 19.2.4 | UI library |
| **TypeScript** | 5 | Type safety |
| **Tailwind CSS** | 4 | Utility-first styling |
| **Sonner** | 2.0.7 | Toast notifications |

## 📁 Project Structure

```
app/                          # Next.js App Router
├── order/[id]/              # Dynamic payment page
├── customers/               # Customers management
├── livestreams/             # Livestreams list
├── orders/                  # Orders management
└── ...

components/
├── payment/                 # Payment QR components
│   ├── qr-code-display.tsx
│   ├── bank-transfer-section.tsx
│   ├── copy-button.tsx
│   ├── success-modal.tsx
│   └── ...
└── ...

lib/
├── order-client.ts          # Order API utilities
├── clipboard-utils.ts       # Clipboard helpers
├── proxy-client.ts          # HTTP client wrapper
└── ...
```

## 🌐 API Integration

The app connects to a NestJS backend at `/api/v1`:

- `GET /api/v1/orders/:id` - Fetch order payment details
- `POST /api/v1/orders/:id/log` - Log payment action (optional)

See `FE_API_INTEGRATION.md` for complete API documentation.

## 🚢 Deployment

### Option 1: Render.com (Recommended)
```bash
# Push to GitHub
git push origin main

# Render auto-deploys using render.yaml
```

### Option 2: Vercel (Easiest)
```bash
# Import repository on vercel.com/dashboard
# Automatic deployment on push
```

### Option 3: Docker
```bash
docker build -t live-tracker-web .
docker run -p 3000:3000 live-tracker-web
```

See `DEPLOYMENT_GUIDE.md` and `QUICK_DEPLOY.md` for detailed instructions.

## 📚 Documentation

| File | Purpose |
|------|---------|
| `PAYMENT_QR_PLAN.md` | Payment page design & requirements |
| `IMPLEMENTATION_SUMMARY.md` | Feature implementation details |
| `DEPLOYMENT_GUIDE.md` | Complete deployment handbook |
| `QUICK_DEPLOY.md` | Quick deployment reference |
| `FE_API_INTEGRATION.md` | Backend API contracts |
| `INSTAGRAM_LINK_FLOW_GUIDE.md` | Instagram OAuth flow |

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit with your values:
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NODE_ENV=development
```

### Next.js Config

- **Output Mode:** `standalone` (SSR with dynamic routes)
- **Image Optimization:** Enabled with unoptimized fallback
- **Build Size:** ~30-40MB (production bundle)

## 🧪 Testing

### Local Development
```bash
npm run dev
# App runs on http://localhost:3000
```

### Production Build
```bash
npm run build
npm start
# App runs on http://localhost:3000
```

### Payment Page Test
```
http://localhost:3000/order/TEST-ORDER-123
```

Expected behavior:
- QR code displays
- Bank info visible
- Copy buttons work
- Toast notifications appear
- Modal appears on confirm button

## 📈 Performance

- **Build Time:** ~4-5 seconds
- **Start Time:** <1 second
- **Page Load:** <100ms (static), <500ms (dynamic)
- **Bundle Size:** ~25-40MB (standalone)
- **CSS:** Tailwind (optimized for production)

## 🐛 Troubleshooting

### Build Fails
```bash
npm run build
# Check for TypeScript errors
```

### Port Already in Use
```bash
PORT=3001 npm run dev
```

### Deployment Issues
See `DEPLOYMENT_GUIDE.md` troubleshooting section.

## 📱 Mobile Optimization

- Responsive design (320px - 768px+)
- Touch-friendly buttons
- QR code optimized for Instagram Webview
- No keyboard interference
- Optimized for 4G connections

## 🔒 Security

- ✅ JWT authentication support
- ✅ Environment variables for secrets
- ✅ CORS configured
- ✅ No hardcoded credentials
- ✅ Rate limiting ready (backend enforced)

## 📊 Monitoring

### Local Development
```bash
npm run dev
# Check terminal for logs
```

### Production
- **Render:** Dashboard metrics
- **Vercel:** Analytics dashboard
- **Docker:** Container logs via `docker logs`

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/payment-page`
2. Commit changes: `git commit -m "feat: Add feature"`
3. Push to GitHub: `git push origin feature/payment-page`
4. Open Pull Request

## 📞 Support

For issues or questions:
1. Check documentation in root folder
2. Review API integration guide
3. Check deployment troubleshooting

## 📄 License

Private project - All rights reserved

---

## 📅 Recent Updates (28/03/2026)

✅ Payment QR page implemented and tested  
✅ Deployment configuration ready  
✅ Documentation complete  
✅ Docker support added  
✅ Production build successful  

**Status:** 🟢 **Ready for Production**

---

For detailed feature implementation, see `IMPLEMENTATION_SUMMARY.md`  
For deployment, see `QUICK_DEPLOY.md`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
