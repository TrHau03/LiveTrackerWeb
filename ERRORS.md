# ERROR LOGS & LEARNINGS

## [2026-04-16 23:06] - Next.js Build Error: Missing Suspense Boundary

- **Type**: Agent Execution Error / Process Failure
- **Severity**: High
- **Fix Applied**: Wrapped `InstagramAuthCallbackScreen` component in a `<Suspense fallback={null}>` boundary.
- **Status**: Fixed

---

## [2026-04-16 23:35] - Routing: Middleware Blocking Static Assets (CSS/JS)

- **Type**: Logic Error / Infrastructure
- **Severity**: Critical
- **File**: `functions/_middleware.js`
- **Root Cause**: Middleware for `pay.livetracker.vn` was redirecting everything that wasn't `/order` to `https://livetracker.vn`, including system assets (`/_next/`, `.css`, `.js`). This caused the page to appear unstyled and prevented JS hydration.
- **Status**: Improved (Transitioned to Whitelist)

---

## [2026-04-16 23:40] - Cloudflare: Middleware "This page couldn't load" (404/Crash)

- **Type**: Infrastructure / Static Export Compatibility
- **Severity**: Critical
- **File**: `functions/_middleware.js`
- **Agent**: Jarvis
- **Root Cause**: 
  1. The aggressive negative conditions (`!isOrderPath`) were causing crashes or missing file errors during Cloudflare's static file resolution.
  2. Static Export results in `/order.html` but browser requests `/order`. Middleware wasn't explicitly allowing the underlying `.html` file flow in some cases.
  3. Clicking "Reload" on Cloudflare error pages triggered the catch-all redirect because parameters were handled inconsistently during the error state.
- **Fix Applied**: 
  - **Whitelist Strategy**: Explicitly permit `_next`, `static`, `.html`, `.css`, `.js`, `.png` etc. first.
  - **Support /order.html**: Explicitly whitelisted `.html` and `/order.html` paths.
  - **Try-Catch Block**: Added `try-catch` to the entire middleware to ensure that any runtime error (like `new URL()` failures) doesn't crash the request and instead falls back to `context.next()`.
  - **Response.redirect**: Used standard `Response.redirect` instead of manual `new Response` for cleaner headers.
- **Prevention**: Use whitelist-first logic for middleware on Cloudflare Pages to avoid interfering with the platform's static routing and asset serving.
- **Status**: Fixed (Awaiting verification)

---
