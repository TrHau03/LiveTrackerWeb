# ERROR LOGS & LEARNINGS

## [2026-04-16 23:06] - Next.js Build Error: Missing Suspense Boundary

- **Type**: Agent Execution Error / Process Failure
- **Severity**: High
- **Fix Applied**: Wrapped components using `useSearchParams()` in a `<Suspense>` boundary.
- **Status**: Fixed

---

## [2026-04-16 23:35] - Routing: Middleware Blocking Static Assets (CSS/JS)

- **Type**: Logic Error / Infrastructure
- **Severity**: Critical
- **Fix Applied**: Added Whitelist for `_next`, `static`, `.css`, `.js`, etc.
- **Status**: Fixed

---

## [2026-04-16 23:40] - Cloudflare: Middleware "This page couldn't load" (404/Crash)

- **Type**: Infrastructure / Static Export Compatibility
- **Severity**: Critical
- **Fix Applied**: Implemented robust Whitelist and `try-catch` fail-safe.
- **Status**: Fixed

---

## [2026-04-16 23:43] - Redirect: "No content available because this request was redirected"

- **Type**: Logic Error / Browser Compatibility (Safari/iOS)
- **Severity**: High
- **File**: `functions/_middleware.js`
- **Agent**: Jarvis
- **Root Cause**: 
  1. `Response.redirect` helper sometimes creates redirects that browsers like Safari dislike if they are empty or lack specific cache headers.
  2. "Double Redirection": Requests were hitting multiple 301 rules in sequence (e.g., Domain Redirect -> Path Format Redirect).
- **Fix Applied**: 
  - **Raw Redirect Response**: Replaced `Response.redirect` with `new Response(null, { status: 301, headers: { 'Location': url, 'Cache-Control': 'no-cache' } })`.
  - **Single-Pass Routing**: Unified the redirect logic so that a request from the wrong domain or format is sent directly to the final destination in ONE step.
  - **Cache Control**: Added `no-cache` to ensure browsers always check the latest routing rules.
- **Prevention**: Use raw `Response` objects for redirects in Cloudflare Middleware to maximize compatibility and avoid multiple redirect hops.
- **Status**: Fixed

---
