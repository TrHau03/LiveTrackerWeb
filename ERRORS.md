# ERROR LOGS & LEARNINGS

## [2026-04-16 23:06] - Next.js Build Error: Missing Suspense Boundary

- **Type**: Agent Execution Error / Process Failure
- **Severity**: High
- **File**: `app/instagram-auth-callback/page.tsx`, `app/ul/page.tsx`
- **Agent**: Jarvis
- **Root Cause**: Next.js 13+ requires `useSearchParams()` to be wrapped in a `Suspense` boundary during static rendering (prerendering).
- **Error Message**: `⨯ useSearchParams() should be wrapped in a suspense boundary at page "/instagram-auth-callback".`
- **Fix Applied**: Wrapped `InstagramAuthCallbackScreen` component in a `<Suspense fallback={null}>` boundary in both affected page files.
- **Prevention**: Always wrap components using `useSearchParams()` in a `Suspense` boundary if they are part of a page that might be statically rendered.
- **Status**: Fixed

---

## [2026-04-16 23:14] - URL Malformed: Double Question Marks in Redirect

- **Type**: Logic Error
- **Severity**: Critical
- **File**: `functions/_middleware.js`
- **Agent**: Jarvis
- **Root Cause**: Middleware appended a query string (starting with `?`) to a URL that already contained a fixed query parameter (`?id=...`), resulting in `?id=xxx?token=yyy`.
- **Error Message**: Link thanh toán bị kẹt ở "Đang tải thông tin đơn hàng..." do tham số `id` bị sai (chứa luôn cả phần token).
- **Fix Applied**: Updated middleware to replace leading `?` with `&` when appending existing search parameters to the new redirected URL.
- **Prevention**: Use URL object for manipulation or handle search string merging more robustly. 
- **Status**: Fixed

---

## [2026-04-16 23:23] - Hang/Loop: Infinite Loading on Public Order Page

- **Type**: Configuration / Logic Error
- **Severity**: Critical
- **File**: `lib/order-client.ts`
- **Agent**: Jarvis
- **Root Cause**: 
  1. Inconsistent default API URL (`localhost:3001` vs `admin.livetracker.vn`). Missing environment variables caused the client to hit an unreachable localhost endpoint in production.
  2. Lack of fetch timeout allowed requests to hang indefinitely.
- **Error Message**: Giao diện kẹt ở "Đang tải thông tin đơn hàng..." mà không bao giờ chuyển tiếp.
- **Fix Applied**: 
  - Aligned default API URL with production endpoint to ensure consistency if `.env` fails.
  - Implemented `AbortController` with a 10-second timeout for public API calls.
  - Added debug logging to track the actual URL being fetched.
- **Prevention**: Use centralized configuration for API endpoints instead of hardcoding defaults in multiple files. Always implement global or per-request timeouts for data fetching.
- **Status**: Fixed

---
