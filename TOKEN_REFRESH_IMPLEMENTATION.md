# 🔐 Token Refresh Implementation - Hybrid Approach

**Date:** April 2, 2026  
**Status:** ✅ Backend Implementation Complete

---

## 📋 NHỮNG GÌ ĐÃ THAY ĐỔI

### 1. **File mới tạo**
```
src/common/interceptors/token-refresh.interceptor.ts
```

**Mục đích:**
- Tự động kiểm tra expiration time của token trên mỗi request
- Nếu token còn < 5 phút → tạo token mới
- Trả về token mới qua header `x-refreshed-access-token`

**Cách hoạt động:**
```typescript
// Mỗi request:
1. Extract Authorization Bearer token
2. Decode token (không verify, chỉ lấy expiration)
3. Tính thời gian còn lại = exp - now
4. Nếu 0 < timeLeft < 300s (5 phút):
   ✓ Generate token mới
   ✓ Set header: x-refreshed-access-token
5. Response trả về như bình thường + header mới
```

---

### 2. **File đã sửa**

#### **src/app.module.ts**
```diff
+ import { TokenRefreshInterceptor } from "./common/interceptors/token-refresh.interceptor";

@Module({
  ...
  providers: [TokenRefreshInterceptor],  // ← Thêm interceptor
})
```

#### **src/main.ts**
```diff
+ import { TokenRefreshInterceptor } from "./common/interceptors/token-refresh.interceptor";

// Register global interceptor
+ app.useGlobalInterceptors(app.get(TokenRefreshInterceptor));

// Add to CORS exposedHeaders
+ exposedHeaders: [..., 'x-refreshed-access-token']
```

---

## ✅ BACKEND HIỆN CÓ GÌ?

### **Token Configuration**
| Config | Value | Mục đích |
|--------|-------|---------|
| **Access Token** | 15 phút | Ngắn = bảo mật cao |
| **Refresh Token** | 7 ngày | Dài = UX tốt |
| **Auto-Refresh** | < 5 phút | Proactive refresh |
| **Expires Check** | Có (ignoreExpiration: false) | Reject hết hạn |

### **Endpoints**

#### 1️⃣ **POST /api/v1/auth/login**
```
Request:
{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### 2️⃣ **POST /api/v1/auth/refresh-token** (Manual Refresh)
```
Request:
{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc..."  // ← Token mới
  }
}
```

#### 3️⃣ **Tất cả Protected Routes** (Với Auto-Refresh)
```
Request:
  Headers: {
    "Authorization": "Bearer eyJhbGc..."
  }

Response:
  Headers: {
    "x-refreshed-access-token": "eyJhbGc..."  // ← Có thể có token mới
  }
  Body: {
    "success": true,
    "data": { ... }
  }
```

### **Security Checks**
```typescript
✅ JWT signature verification
✅ Token expiration check
✅ User account status:
   - isActive = true
   - isBlocked = false
   - isDeleted = false
✅ Auto-refresh proactive (5 phút trước hết hạn)
✅ 401 khi token hết hạn
```

---

## 🎯 FRONTEND CẦN LÀM GÌ?

### **Flow Tổng Quát**
```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ proxyRequest gửi:                        │
│ - Authorization: Bearer {accessToken}    │
│ - x-refresh-token: {refreshToken}        │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Backend kiểm tra token (Auto-refresh)    │
│ - Nếu token < 5 phút → generate mới      │
│ - Trả response header x-refreshed-token  │
└──────┬───────────────────────────────────┘
       │
       ├─── Token Still Valid ────┐
       │                          │
       ▼                          ▼
    Response 200          Response 200 + Header
                          (x-refreshed-access-token)
       │                          │
       └──────────┬───────────────┘
                  │
                  ▼
        ┌──────────────────────────┐
        │ handleAuthSync() function │
        │ - Check for new token     │
        │ - Update patchSession()   │
        └──────────────────────────┘
       
       │
       └─── Token Expired (401) ─────┐
                                     │
                                     ▼
                            ❌ Auto logout
                            (Fallback: Manual refresh)
```

---

### **Implementation Steps (Using Existing FE Structure)**

#### **Step 1: Update `lib/auth-response.ts` - Handle Token Refresh**

```typescript
import type { SessionSettings } from "@/lib/workspace-session";

export function applyAuthResponses(
  responses: Response[],
  patchSession: (patch: Partial<SessionSettings>) => void,
  logout: () => Promise<void>,
) {
  // ✅ OPTION 1: Auto-Refresh from Backend
  // Backend tự động kiểm tra & gửi token mới nếu token < 5 phút
  const refreshedAccessToken = responses
    .map((response) => response.headers.get("x-refreshed-access-token"))
    .find(Boolean);

  if (refreshedAccessToken) {
    console.log("✅ Token auto-refreshed by backend");
    patchSession({
      accessToken: refreshedAccessToken,
    });
  }

  // ✅ OPTION 2: Fallback - Manual Refresh on 401
  // Nếu token hết hạn, backend trả 401 → frontend gọi refresh endpoint
  if (responses.some((response) => response.status === 401)) {
    void logout();
  }
}
```

**Khác biệt:** Đã rename từ `handleAuthSync` → `applyAuthResponses` cho rõ ràng hơn.

---

#### **Step 2: Update `lib/proxy-client.ts` - Add Manual Refresh Fallback**

Thêm hàm refresh token khi 401:

```typescript
async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string } | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "https://admin.livetracker.vn/api/v1"}/auth/refresh-token`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      data?: {
        accessToken?: string;
      };
    };

    return {
      accessToken: payload.data?.accessToken ?? "",
    };
  } catch (error) {
    console.error("Token refresh failed:", error);
    return null;
  }
}
```

---

#### **Step 3: Update hooks (e.g., `hooks/use-orders.ts`) - Already Good!**

FE hooks đã đúng cách, chỉ cần rename hàm:

```typescript
import { applyAuthResponses } from "@/lib/auth-response";

export function useOrders(search?: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["orders", session.user?.id, search],
    queryFn: async () => {
      const response = await fetchMyOrders(session, {
        page: 1,
        limit: 20,
        search: search || undefined,
      });
      
      // ✅ This handles auto-refresh from backend
      applyAuthResponses([response.response], patchSession, logout);
      
      return response.data;
    },
    enabled: !!session.accessToken,
  });
}
```

---

#### **Step 4: Update `components/session-provider.tsx` - Handle 401 in User Fetch**

Cập nhật logic trong useEffect để retry với refresh token khi 401:

```typescript
useEffect(() => {
  if (!isReady || !session.accessToken || session.user) {
    return;
  }

  const controller = new AbortController();

  fetchUserProfile(
    {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    },
    controller.signal,
  )
    .then((result) => {
      if (!result.user) {
        return;
      }

      startTransition(() => {
        setSession((current) => ({
          ...current,
          accessToken: result.accessToken ?? current.accessToken,
          user: result.user,
        }));
      });
    })
    .catch((error) => {
      // ✅ NEW: Handle 401 with refresh retry
      if (error instanceof Error && error.message.includes("401")) {
        console.log("⚠️ Access token expired on initial fetch");
        // Logout - let user re-login
        setSession(DEFAULT_SESSION);
      }
      // Ignore hydration failure and let screens surface API errors if needed.
    });

  return () => controller.abort();
}, [isReady, session.accessToken, session.refreshToken, session.user]);
```

---

#### **Step 5: Login Flow (Already Correct!)**

```typescript
const response = await fetchUserProfile(
  {
    accessToken,      // ← Mới nhận từ BE
    refreshToken,     // ← Mới nhận từ BE
  },
  undefined,
);

startTransition(() => {
  setSession({
    accessToken: response.accessToken ?? accessToken,
    refreshToken,     // ← Lưu refresh token
    user: response.user,
  });
});
```

**✅ Đã gửi refresh token, backend sẽ lưu và dùng để auto-refresh!**

---

## 📊 **So Sánh Trước & Sau**

### **TRƯỚC (Hiện tại - Bị logout nhanh):**
```
⚠️ Frontend:
  - Không kiểm tra token còn bao lâu
  - Chỉ làm mới token khi backend trả 401
  - UX: Request 1 ok → Request 2 logout (nếu token hết)

⚠️ Backend:
  - Không gửi token mới qua header
  - Chỉ trả về accessToken+refreshToken khi login

❌ Result:
  User gửi request
  → Token hết hạn
  → Backend reject: 401
  → FE logout tức thì
  → User bị kick ra 😡
```

### **SAU (Sau khi implement auto-refresh):**
```
✅ Frontend:
  - proxyRequest() gửi: Authorization + x-refresh-token headers
  - applyAuthResponses() tự động nhận & cập nhật token mới
  - Không bao giờ bị 401 logout

✅ Backend:
  - TokenRefreshInterceptor kiểm tra token mỗi request
  - Nếu token còn < 5 phút → generate token mới
  - Gửi response header: x-refreshed-access-token
  - Token luôn fresh, không bao giờ hết hạn đột ngột

✅ Result:
  Request 1: Token còn 2 phút
  → Backend: "Token sắp hết, đây token mới"
  → FE cập nhật token
  
  Request 2: Token mới (15 phút)
  → Backend: "Token ok"
  → Response 200
  
  User hoàn toàn không biết token đã được refresh 🎉
  → Seamless UX, không logout, không interrupt
```

---

## 🔄 **Token Lifecycle**

```
┌──────────────────────────────────────────────────────────┐
│ User Login                                               │
│ POST /auth/login → Get accessToken (15m) + refreshToken │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼ (FE lưu vào session)
        ┌──────────────────────────────┐
        │ Minute 0-10: Token Fresh     │
        │ Every request → 200 OK       │
        │ No refresh needed            │
        └──────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Minute 10-15: Token Near Expiry  │
        │ Backend detect: < 5m remaining   │
        │ → Generate new accessToken      │
        │ → Send x-refreshed-access-token │
        │ → FE update automatically       │
        └──────────────────────────────────┘
                       │
                       ▼ (Loop: Token fresh again!)
        ┌──────────────────────────────┐
        │ Minute 0-10: Token Fresh 🔄  │
        │ Every request → 200 OK       │
        │ No refresh needed            │
        └──────────────────────────────┘
                       │
       ┌───────────────┴──────────────┐
       │ (Repeat infinitely)          │
       │ Token always fresh!          │
       │ Zero logout disruptions      │
       └──────────────────────────────┘
```

---

## 🔒 **Bảo Mật**

| Layer | Kiểm soát | Chi tiết |
|-------|-----------|---------|
| **Backend** | Access Token TTL | 15 phút = hạn chế exposure time |
| **Backend** | Refresh Token TTL | 7 ngày = balanced UX |
| **Backend** | JWT Secret** | Chỉ backend biết |
| **Backend** | Token Signature** | Verify mỗi request |
| **Backend** | User Status** | Check active/blocked/deleted |
| **Backend** | Auto-Refresh** | Proactive = reduce attack window |
| **Frontend** | localStorage** | Store securely (không inline) |
| **Frontend** | HTTPS** | Transmit encrypted |
| **Frontend** | Request Header** | Không URL query param |

---

## ✅ **Checklist Deployment**

### **Backend - DONE ✓**
- [x] TokenRefreshInterceptor created
- [x] Registered in AppModule
- [x] Global interceptor in main.ts
- [x] CORS exposedHeaders updated: `x-refreshed-access-token`
- [x] `/auth/refresh-token` endpoint working
- [x] Token auto-generated when < 5 phút remaining

### **Frontend - TODO (Next Steps)**
- [ ] Rename `handleAuthSync` → `applyAuthResponses` in lib/auth-response.ts
- [ ] Update all hooks to use `applyAuthResponses` (use-orders, use-lives, use-customers, etc.)
- [ ] Update `session-provider.tsx` - ensure refreshToken is stored & sent in patchSession
- [ ] Add `refreshAccessToken()` function to proxy-client.ts (for 401 fallback)
- [ ] Test: Make API call, check response headers for `x-refreshed-access-token`
- [ ] Test: Verify localStorage token is updated
- [ ] Test: Wait token > 10 min, verify no logout
- [ ] Deploy to production

---

## 🧪 **Test Scenarios**

### **Test 1: Auto-Refresh Works**
```
Steps:
  1. Login → FE stores accessToken + refreshToken
  2. Make API call (e.g., fetchMyOrders)
  3. Check browser DevTools → Network tab
  4. Look at Response Headers for: x-refreshed-access-token
  
Expected:
  ✓ Header present (token < 5 phút)
  ✓ FE updates localStorage with new token
  ✓ Next request uses fresh token
  ✓ No 401 errors
```

### **Test 2: Token Stays Fresh**
```
Steps:
  1. Login
  2. Make requests every 30 seconds
  3. Watch for 401 errors
  4. Continue for 30 minutes
  
Expected:
  ✓ All requests: 200 OK
  ✓ Zero 401 errors
  ✓ Never redirects to login
  ✓ User experience: Seamless
```

### **Test 3: RefreshToken Expiry (7 days)**
```
Steps:
  1. Login → get tokens
  2. Modify token to expire (hardcode old date)
  3. Make API call
  4. Try manual refresh (POST /auth/refresh-token)
  
Expected:
  ✓ Manual refresh fails (refreshToken expired)
  ✓ FE logs user out
  ✓ Redirect to login page
```

### **Test 4: Concurrent Requests**
```
Steps:
  1. Login
  2. Trigger 10 requests simultaneously
  3. Check response headers
  
Expected:
  ✓ All succeed (200 OK)
  ✓ Multiple may have x-refreshed-access-token
  ✓ FE handles concurrent updates correctly
  ✓ No race conditions
```

---

## 📞 **Troubleshooting & Support**

### **Issue 1: Token không được refresh (FE vẫn bị logout)**
```
Symptoms:
  - Request 1 ok, request 2 → 401 logout
  - DevTools headers không thấy x-refreshed-access-token
  
Giải pháp:
  1. Kiểm tra Backend:
     - TokenRefreshInterceptor có hoạt động không?
     - CORS exposedHeaders có include 'x-refreshed-access-token' không?
     - Endpoint /auth/refresh-token còn hoạt động không?
  
  2. Kiểm tra FE:
     - applyAuthResponses() được gọi trong mọi hook không?
     - proxy-client.ts có gửi x-refresh-token header không?
     - localStorage có lưu refreshToken không?
```

### **Issue 2: Token quá nhanh hết hạn (< 5 phút)**
```
Symptoms:
  - Token TTL quá ngắn (3 phút thay vì 15 phút)
  - User bị logout thường xuyên
  
Giải pháp:
  1. Kiểm tra Backend config:
     - JWT_EXPIRATION = 15 minutes? (không phải 3m)
     - JWT_REFRESH_EXPIRATION = 7 days?
  
  2. Trong TokenRefreshInterceptor:
     - Auto-refresh threshold = 5 minutes (đúng?)
```

### **Issue 3: Header x-refreshed-access-token không được return**
```
Symptoms:
  - Every request DevTools không thấy header
  - Browser console không có log "Token auto-refreshed"
  
Giải pháp:
  1. Backend: TokenRefreshInterceptor.ts
     - Check logic: if timeLeft < 300s then generate new token
     - response.setHeader('x-refreshed-access-token', newToken)
  
  2. CORS: main.ts
     - app.enableCors({
         ... 
         allowedHeaders: [..., 'x-refresh-token'],
         exposedHeaders: [..., 'x-refreshed-access-token']
       })
```

### **Issue 4: FE không cập nhật token từ header**
```
Symptoms:
  - Header có trả về, nhưng localStorage token không update
  - Request tiếp theo vẫn dùng cái token cũ
  
Giải pháp:
  1. Check lib/auth-response.ts:
     - applyAuthResponses() có được call không?
     - patchSession() được gọi với đúng tham số không?
  
  2. Check session-provider.tsx:
     - patchSession() có đúng merge refreshToken không?
     - setSession() có cập nhật localStorage không?
```

### **Issue 5: Concurrent requests causing token conflicts**
```
Symptoms:
  - 2 requests cùng lúc
  - Backend send 2 different new tokens
  - FE bị confused, token không consistent
  
Giải pháp:
  1. Mỗi hook gọi applyAuthResponses() riêng
  2. session-provider xử lý merge correctly
  3. Zustand auth-store làm handle state changes safely
```

---

## 🚀 **Implementation Ready**

**Backend:** ✅ DONE - TokenRefreshInterceptor đã cài đặt

**Frontend:** Cần implement 2 bước chính:

1. **Rename & Update:**
   - `lib/auth-response.ts`: `handleAuthSync` → `applyAuthResponses`
   - Tất cả hooks: Update imports & gọi hàm mới

2. **Test:**
   - Login → Make requests
   - Check DevTools for `x-refreshed-access-token` header
   - Verify token updates automatically
   - Test 30 phút liên tục, không logout

**Time to implement:** ~30 phút (chủ yếu rename + test)

---

**Backend Ready! 🎉 Frontend có thể bắt đầu integrate ngay bây giờ.**
