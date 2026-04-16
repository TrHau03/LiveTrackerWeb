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

- **Type**: Configuration / Logic Error / CORS
- **Severity**: Critical
- **File**: `lib/order-client.ts`, `components/payment/order-payment-page-container.tsx`
- **Agent**: Jarvis
- **Root Cause**: 
  1. Inconsistent default API URL (`localhost:3001` vs `admin.livetracker.vn`).
  2. Lack of fetch timeout allowed requests to hang indefinitely.
  3. **New finding**: `Content-Type: application/json` header in a GET request was likely triggering CORS Preflight (OPTIONS) which the server might not allow from the payment domain.
  4. Instant redirect on error made it impossible for users to see what went wrong.
- **Fix Applied**: 
  - Aligned default API URL with production endpoint.
  - Implemented 10s timeout using `AbortController`.
  - **Optimized CORS**: Removed `Content-Type` header for GET requests.
  - **Improved UX**: Replaced instant redirect with a detailed Error UI and Retry button.
  - **Standardized URL construction**: Switched to `URL` constructor for robust path joining.
- **Prevention**: Avoid unnecessary headers in GET requests to prevent sensitive CORS issues. Provide clear feedback to users when data fails to load instead of silent failure/redirect.
- **Status**: Fixed

---
