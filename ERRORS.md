# ERROR LOGS & LEARNINGS

## [2026-04-16 23:06] - Next.js Build Error: Missing Suspense Boundary

- **Type**: Agent Execution Error / Process Failure
- **Severity**: High
- **File**: `app/instagram-auth-callback/page.tsx`, `app/ul/page.tsx`
- **Agent**: Jarvis
- **Root Cause**: Next.js 13+ requires `useSearchParams()` to be wrapped in a `Suspense` boundary during static rendering (prerendering).
- **Error Message**: 
  ```
  ⨯ useSearchParams() should be wrapped in a suspense boundary at page "/instagram-auth-callback".
  ```
- **Fix Applied**: Wrapped `InstagramAuthCallbackScreen` component in a `<Suspense fallback={null}>` boundary in both affected page files.
- **Prevention**: Always wrap components using `useSearchParams()` in a `Suspense` boundary if they are part of a page that might be statically rendered.
- **Status**: Fixed

---
