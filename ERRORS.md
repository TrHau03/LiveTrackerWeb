# ERROR LOGS & LEARNINGS

## [2026-04-16 23:06] - Next.js Build Error: Missing Suspense Boundary

- **Type**: Agent Execution Error / Process Failure
- **Severity**: High
- **File**: `app/instagram-auth-callback/page.tsx`, `app/ul/page.tsx`
- **Agent**: Jarvis
- **Root Cause**: Next.js 13+ requires `useSearchParams()` to be wrapped in a `Suspense` boundary during static rendering (prerendering).
- **Fix Applied**: Wrapped `InstagramAuthCallbackScreen` component in a `<Suspense fallback={null}>` boundary.
- **Status**: Fixed

---

## [2026-04-16 23:14] - URL Malformed: Double Question Marks in Redirect

- **Type**: Logic Error
- **Severity**: Critical
- **File**: `functions/_middleware.js`
- **Agent**: Jarvis
- **Root Cause**: Middleware appended a query string (starting with `?`) to a URL that already contained `?id=...`, resulting in `?id=xxx?token=yyy`.
- **Status**: Fixed

---

## [2026-04-16 23:23] - Hang/Loop: Infinite Loading on Public Order Page

- **Type**: Configuration / CORS
- **Severity**: Critical
- **File**: `lib/order-client.ts`
- **Root Cause**: Inconsistent default API URL and lack of timeout. `Content-Type` header was also likely triggering CORS preflight.
- **Fix Applied**: Aligned default API URL, added 10s timeout, removed `Content-Type` for GET requests.
- **Status**: Fixed

---

## [2026-04-16 23:35] - Routing: Middleware Blocking Static Assets (CSS/JS)

- **Type**: Logic Error / Infrastructure
- **Severity**: Critical
- **File**: `functions/_middleware.js`
- **Agent**: Jarvis
- **Root Cause**: Middleware for `pay.livetracker.vn` was too aggressive. It redirected EVERYTHING that wasn't `/order` to `https://livetracker.vn`, including `/_next/static/` files. This caused the page to appear as plain unstyled text and prevented JavaScript hydration (app stuck in loading state).
- **Error Message**: Trang chỉ hiện "Đang tải thông tin đơn hàng..." dạng văn bản thô, không có giao diện, không thể mở được nội dung đơn hàng.
- **Fix Applied**: Updated middleware to exclude Next.js assets (`/_next/`, `/static/`) and common static extensions (`.css`, `.js`, `.png`, etc.) from the redirection rule.
- **Prevention**: When implementing domain-level security/routing in middleware, always ensure that internal framework assets and static resources are explicitly allowed to pass through.
- **Status**: Fixed

---
