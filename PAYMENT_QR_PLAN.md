# Payment QR Code Page - Chi tiết Implementation Plan

**Ngày tạo:** 28/03/2026  
**Phiên bản:** 1.0  
**Trạng thái:** Planning Phase

---

## I. PHÂN TÍCH CẤU TRÚC PROJECT HIỆN TẠI

### Stack hiện tại:
- **Framework:** Next.js 16.2.1 (App Router)
- **React:** 19.2.4
- **CSS:** Tailwind CSS 4 + PostCSS
- **Language:** TypeScript 5
- **Authentication:** JWT (15m accessToken, 7d refreshToken)
- **API Pattern:** RESTful via `/api/v1` prefix
- **Client Utilities:** `proxy-client.ts` (session-aware API wrapper)

### Cấu trúc hiện có:
```
app/
  ├── layout.tsx (root layout)
  ├── page.tsx (dashboard)
  ├── orders/ (orders list page)
  ├── customers/ (customers page)
  ├── livestreams/ (livestreams page)
  ├── instagram-auth-callback/ (OAuth callback)
  └── ul/ (universal links)
  
lib/
  ├── proxy-client.ts (HTTP wrapper with session)
  ├── workspace-session.ts (session type definitions)
  ├── auth-response.ts (auth utilities)
  ├── instagram-auth.ts (Instagram OAuth)
  └── site.ts (site config)

components/
  ├── workspace-screens.tsx (screen components)
  └── ... (other shared components)
```

### API Convention từ FE_API_INTEGRATION.md:
- Base URL: `/api/v1`
- Auth header: `Authorization: Bearer <accessToken>`
- Response format:
  ```json
  {
    "success": true,
    "message": "...",
    "data": { /* actual data */ }
  }
  ```
- Error format: `{ "success": false, "message": "...", "statusCode": 400 }`

---

## II. PHÂN TÍCH YÊU CẦU TRANG THANH TOÁN QR CODE

### 1. URL Route
- **Path:** `/order/[id]` (dynamic route)
- **Example:** `/order/DH123`
- **Mô tả:** Trang thanh toán được mở từ Webview của Instagram

### 2. Data Model

#### Request
```typescript
// GET /api/v1/orders/:id
// Returns:
{
  success: true,
  data: {
    orderId: string;        // ví dụ: "DH123"
    items: {                // Danh sách sản phẩm
      productName: string;
      quantity: number;
      price: number;
    }[];
    totalAmount: number;    // Tổng tiền (VND)
    qrCodeUrl: string;      // URL ảnh QR từ Firebase
    
    // Thông tin chuyển khoản (có thể từ shop config hoặc order)
    bankTransfer: {
      recipientName: string;      // Tên người nhận
      bankName: string;           // Ngân hàng (ví dụ: "Vietcombank")
      accountNumber: string;      // Số tài khoản
      transferDescription: string; // Nội dung chuyển khoản (thường = orderId)
    }
  }
}
```

#### Frontend State
```typescript
type OrderPaymentData = {
  orderId: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
  totalAmount: number;
  qrCodeUrl: string;
  bankTransfer: {
    recipientName: string;
    bankName: string;
    accountNumber: string;
    transferDescription: string;
  };
};

type PaymentPageState = {
  loading: boolean;
  error: string | null;
  data: OrderPaymentData | null;
  showSuccessModal: boolean;
};
```

### 3. UI Layout

**Mobile-First Design (375px base width)**

**Design Principle:** QR Code + Bank Transfer Info ở trên cùng (above the fold) để người dùng vừa vào là thấy toàn bộ thông tin cần thiết cho việc chuyển khoản.

```
┌─────────────────────────────────────┐
│  Payment Page - Order DH123         │
├─────────────────────────────────────┤
│                                     │
│       [QR CODE IMAGE]               │
│       (300x300px responsive)        │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  💳 BANK TRANSFER INFORMATION       │
│  ─────────────────────────────────  │
│  Recipient: Cửa hàng ABC           │
│  Bank: Vietcombank                 │
│  Account: 1234567890 [COPY]        │
│  Amount: 750,000 VND [COPY]        │
│  Content: DH123 [COPY]             │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  📌 Sau khi chuyển khoản thành công │
│     vui lòng chụp lại màn hình      │
│     giao dịch.                      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  [✓ Tôi đã chuyển khoản xong]      │
│                                     │
├─────────────────────────────────────┤
│                                     │
│  📦 ORDER INFORMATION               │
│  ─────────────────────────────────  │
│  Product 1 x 2 - 500,000 VND       │
│  Product 2 x 1 - 250,000 VND       │
│  ─────────────────────────────────  │
│  Total: 750,000 VND                │
│                                     │
└─────────────────────────────────────┘
```

**Layout Flow:**
1. **Header:** QR Code (300x300px) - center viewport, user sees immediately
2. **Section 1:** Bank Transfer Information (sticky/prominent)
3. **Section 2:** Payment Confirmation Instruction + Button
4. **Section 3 (scroll):** Order Items & Details (less critical, scrollable)

### 4. Components cần xây dựng

| Component | Mục đích | Render Order |
|-----------|---------|--------------|
| `QRCodeDisplay` | Hiển thị ảnh QR responsive - ưu tiên hiển thị trên cùng | 1st |
| `BankTransferSection` | Hiển thị thông tin chuyển khoản (recipient, bank, account, amount, description) | 2nd |
| `CopyButton` | Reusable nút copy với toast notification | Sub-component |
| `PaymentInstruction` | Hiển thị hướng dẫn chụp màn hình giao dịch | 3rd |
| `ConfirmButton` | Nút "Tôi đã chuyển khoản xong" lớn rõ ràng | 4th |
| `SuccessModal` | Modal hiển thị sau khi click confirm button | Modal |
| `OrderInfoSection` | Danh sách sản phẩm (scrollable, phía dưới) | 5th (scrollable) |
| `OrderPaymentPage` | Client component - orchestrator chính | Main wrapper |

### 5. Features chính

#### 5.1 Data Fetching (Server-side)
- Sử dụng Next.js dynamic route `/order/[id]`
- Fetch dữ liệu từ Backend API qua `proxy-client.ts`
- Handle error khi order không tồn tại (404)
- Support SSR hoặc ISR nếu cần cache

#### 5.2 Copy to Clipboard
- Các field cần Copy:
  1. Số tài khoản
  2. Số tiền (tổng amount)
  3. Nội dung chuyển khoản (orderId)
  
- Sử dụng Web Clipboard API: `navigator.clipboard.writeText()`
- Toast notification: "Đã sao chép [field name]" (2s auto dismiss)

#### 5.3 Success Confirmation
- Khi click "Tôi đã chuyển khoản xong":
  1. Không gọi API xác nhận (hoặc optional gọi log API)
  2. Hiển thị Modal với hướng dẫn:
     ```
     "Cảm ơn bạn! Vui lòng bấm nút [X] hoặc [Xong/Done] 
      ở góc trên cùng của màn hình để đóng trang này, 
      quay lại đoạn chat và gửi ảnh biên lai cho shop nhé."
     ```
  3. Modal có Close button - đóng webview (cần postMessage đến Instagram Webview)

#### 5.4 Webview Integration
- Trang chạy trong Instagram Webview
- Close button cần gửi signal đóng webview:
  ```javascript
  // iOS/Android WebView bridge
  if (window.parent !== window) {
    window.parent.postMessage({ action: 'close' }, '*');
  }
  ```

---

## III. TECHNOLOGY DECISIONS

### 3.1 UI Library
**Quyết định:** Sử dụng **Tailwind CSS + shadcn/ui**
- Lý do: Đã có Tailwind setup, shadcn/ui cung cấp components professional
- Alternative: Dùng pure Tailwind + custom components (simpler nhưng cần code nhiều)

### 3.2 Toast Notification
**Quyết định:** Sử dụng **Sonner** library
- Lý do: Lightweight, zero dependencies, hoạt động tốt trong Next.js
- Alternative: react-toastify, react-hot-toast

### 3.3 QR Code Display
**Quyết định:** Hiển thị image URL trực tiếp (không generate QR)
- Lý do: Backend đã generate QR từ Firebase, chỉ cần display URL
- Note: Nếu sau này cần generate client-side, dùng `qrcode.react`

### 3.4 Data Fetching Strategy
**Quyết định:** Server-side fetch + Fallback to client
```typescript
// Prefer: getServerSideProps (SSR) để tải ngay, tối ưu cho mobile
// Fallback: useEffect client-side fetch nếu có issue
```

### 3.5 Session Handling
- Sử dụng context từ `workspace-session.ts` (nếu có session)
- Nếu payment page không cần auth (public), skip session

---

## IV. API CONTRACTS

### GET /api/v1/orders/:id

**Request:**
```http
GET /api/v1/orders/DH123
Authorization: Bearer <optional-token>
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Order fetched",
  "data": {
    "orderId": "DH123",
    "items": [
      {
        "productName": "Áo thun nam",
        "quantity": 2,
        "price": 500000
      },
      {
        "productName": "Quần jean",
        "quantity": 1,
        "price": 250000
      }
    ],
    "totalAmount": 750000,
    "qrCodeUrl": "https://firebasestorage.googleapis.com/v0/b/.../qr_DH123.png",
    "bankTransfer": {
      "recipientName": "Cửa hàng ABC",
      "bankName": "Vietcombank",
      "accountNumber": "1234567890",
      "transferDescription": "DH123"
    }
  }
}
```

**Error Response (404/400):**
```json
{
  "success": false,
  "message": "Order not found",
  "statusCode": 404
}
```

---

## V. FOLDER STRUCTURE SAU HOÀN THÀNH

```
app/
  ├── order/
  │   └── [id]/
  │       └── page.tsx (new - server component)
  │
components/
  ├── payment/
  │   ├── qr-code-display.tsx (new - display QR, above fold)
  │   ├── bank-transfer-section.tsx (new - bank info, above fold)
  │   ├── copy-button.tsx (new - reusable copy component)
  │   ├── payment-instruction.tsx (new - instruction text)
  │   ├── confirm-button.tsx (new - "Tôi đã chuyển xong" button)
  │   ├── order-info-section.tsx (new - scrollable order details)
  │   ├── success-modal.tsx (new - success confirmation modal)
  │   └── order-payment-page.tsx (new - main client component wrapper)
  │
lib/
  ├── order-client.ts (new - order API utilities)
  └── clipboard-utils.ts (new - clipboard helpers)
```

---

## VI. DEPENDENCIES CẦN CÀI ĐẶT

```json
{
  "dependencies": {
    "sonner": "^1.4.3",
    "next": "16.2.1",
    "react": "19.2.4"
  },
  "devDependencies": {
    "@types/react": "^19",
    "tailwindcss": "^4"
  }
}
```

**Note:** shadcn/ui sẽ được add qua CLI khi cần specific components.

---

## VII. IMPLEMENTATION TIMELINE

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| 1 | Setup dependencies + design review | 30 min |
| 2 | API client + data fetching setup | 30 min |
| 3 | Dynamic route + server page | 30 min |
| 4 | UI components (OrderInfo, BankInfo, QRCode) | 1 hour |
| 5 | Copy button + Toast integration | 30 min |
| 6 | Success modal + Webview close handler | 30 min |
| 7 | Responsive design + mobile optimization | 1 hour |
| 8 | Testing + debugging | 1.5 hours |
| **Total** | | **~6 hours** |

---

## VIII. TESTING CHECKLIST

- [ ] Load trang `/order/DH123` - QR code + bank info visible immediately (no scroll)
- [ ] Copy nút account number - clipboard + toast work
- [ ] Copy nút amount - clipboard + toast work
- [ ] Copy nút transfer description - clipboard + toast work
- [ ] QR code hiển thị sharp trên mobile (300x300px, crisp image)
- [ ] Layout responsive 320px → 768px - QR + bank info stay prominent
- [ ] Scroll down - order items visible below
- [ ] Click "Tôi đã chuyển khoản xong" - modal appear
- [ ] Modal close button - postMessage gửi đi (check DevTools)
- [ ] Load time < 2s trên 4G mobile (Lighthouse)
- [ ] Error state: order not found - hiển thị friendly message
- [ ] Instagram Webview integration - test với webview context

---

## IX. NOTES & GOTCHAS

1. **Webview Context:** Trang chạy trong Instagram Webview - các API khác nhau so với browser
   - May không hỗ trợ nhất số APIs (video playback, camera)
   - postMessage có thể cần custom handler

2. **No Auth Needed:** Payment page nên PUBLIC (không cần JWT)
   - Bỏ qua session auth check
   - Chỉ lấy orderId từ URL params

3. **Firebase QR Image URL:** Cần đảm bảo URL CORS-friendly (public)
   - Test load qrCodeUrl trực tiếp từ browser

4. **Copy Button Race Condition:** 
   - Sau khi copy, tắt toast sau 2s, ready cho copy tiếp
   - Không hiển thị 2 toast cùng lúc

5. **Mobile Keyboard:** Don't use `<input>` để tránh mở keyboard
   - Chỉ dùng `<button>` cho copy action

---

## X. NEXT STEPS

1. ✅ Phê duyệt plan này
2. ⏭️ Cài đặt dependencies (sonner + optional shadcn)
3. ⏭️ Tạo API client utilities
4. ⏭️ Implement dynamic route `/order/[id]`
5. ⏭️ Build components từ đơn giản → phức tạp
6. ⏭️ Integration testing
7. ⏭️ Mobile browser testing
8. ⏭️ Performance optimization
9. ⏭️ Deploy & monitor

---

**Document Version:** 1.0 | Last Updated: 28/03/2026
