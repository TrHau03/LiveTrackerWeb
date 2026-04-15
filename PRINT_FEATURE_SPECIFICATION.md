# 📄 PRINT FEATURE SPECIFICATION — LiveTracker Web (NextJS)

> **Mục đích**: Tài liệu kỹ thuật chi tiết để triển khai 2 tính năng **In chốt đơn Comment** và **In hoá đơn đơn hàng** trên bản web NextJS, tái tạo 100% logic và layout từ app React Native.
>
> **Ngày tạo**: 2026-04-10
> **Source of truth**: LiveTrackerApp — `src/utils/receiptImageGenerator.ts`

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [In chốt đơn Comment (Comment Receipt)](#2-in-chốt-đơn-comment)
3. [In hoá đơn đơn hàng (Order Invoice)](#3-in-hoá-đơn-đơn-hàng)
4. [Print Template Settings (Cài đặt nội dung in)](#4-print-template-settings)
5. [Data Types & Interfaces](#5-data-types--interfaces)
6. [API Endpoints chi tiết](#6-api-endpoints-chi-tiết)
7. [Hướng dẫn triển khai trên NextJS](#7-hướng-dẫn-triển-khai-trên-nextjs)

---

## 1. Tổng quan kiến trúc

### 1.1. So sánh Mobile vs Web

| Khía cạnh | Mobile (React Native) | Web (NextJS) |
|---|---|---|
| Render engine | Skia Offscreen Canvas → JPEG Base64 | HTML/CSS → `window.print()` hoặc `html2canvas` |
| Máy in | Bluetooth Thermal Printer (ESC/POS) | Browser Print Dialog / PDF Export |
| Kết nối | Native Bluetooth SDK | Không cần (browser xử lý) |
| Gửi bill cho KH | Upload ảnh JPEG → API → Instagram DM | Tương tự: render ảnh → upload API |
| Print Settings | API + AsyncStorage cache + Memory cache | API + localStorage cache |

### 1.2. Flow tổng quan

```
┌─────────────────────────────────────────────────────────┐
│                    USER ACTION                          │
│  (Bấm "Chốt đơn" / "In đơn" / "In thêm")              │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  1. Gọi API tạo order (nếu chốt đơn mới)               │
│     POST /orders                                        │
│     Body: { igId, igName, liveId, commentId, actionType }│
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  2. Lấy Print Settings                                  │
│     GET /users/me/print-template                        │
│     → Map sang PrintContentSettings                     │
│     → Cache vào localStorage                            │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  3. Render hoá đơn (HTML/CSS hoặc Canvas)               │
│     → Input: type, settings, data (order/comment)       │
│     → Output: HTML element hoặc ảnh base64              │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌───────────────┴─────────────────────────────────────────┐
│  4a. In trực tiếp       │  4b. Gửi bill cho KH          │
│  window.print()         │  POST /orders/:id/send-bill    │
│  hoặc PDF download      │  Body: FormData { image, igId }│
└─────────────────────────┴───────────────────────────────┘
```

---

## 2. In chốt đơn Comment

### 2.1. Khi nào in?

In chốt đơn comment xảy ra trong **3 trường hợp**:

| Trường hợp | Trigger | actionType | Mô tả |
|---|---|---|---|
| **Chốt đơn** | Bấm nút "Chốt đơn" trên comment chưa xử lý (`status === null`) | `NORMAL` | Tạo order mới từ comment + in |
| **Đã báo lỗi** | Bấm nút "Đã báo lỗi" (warning icon) | `CONFIRMED_ERROR` | Tạo order + in kèm dòng `*SP đã báo lỗi trên live*` |
| **In thêm** | Bấm nút "In thêm" trên comment đã chốt (`status === 'NORMAL'` hoặc `'CONFIRMED_ERROR'`) | Giữ nguyên status hiện tại | Tăng quantity +1 → in lại (KHÔNG tạo order mới) |

> **Lưu ý**: Comment có `status === 'BACKUP'` (dự bị) KHÔNG có nút in trực tiếp — chỉ có nút "Huỷ dự bị".

### 2.2. Flow chi tiết: Chốt đơn

```
User bấm "Chốt đơn" trên CommentItem
    │
    ├── 1. Kiểm tra: comment.status === null? (chưa xử lý)
    │       → Nếu không null → Toast "Comment đã được xử lý"
    │
    ├── 2. Kiểm tra: comment.igUserId tồn tại?
    │       → Nếu không → Toast "Thiếu thông tin"
    │
    ├── 3. Set loading state cho comment
    │
    ├── 4. Gọi API tạo order
    │       POST /api/v1/orders
    │       Body: {
    │           igId: comment.igUserId,
    │           igName: comment.igUsername,
    │           liveId: liveId,
    │           commentId: comment._id,
    │           actionType: "NORMAL",      // hoặc "CONFIRMED_ERROR"
    │           isNewCustomer: comment.isNewCustomer
    │       }
    │
    ├── 5. Cập nhật UI: comment.status = actionType
    │
    ├── 6. Toast thành công: "Đã tạo đơn cho {igUsername}"
    │
    └── 7. Trigger in receipt (xem mục 2.4)
```

### 2.3. Flow chi tiết: In thêm

```
User bấm "In thêm" trên CommentItem (status === 'NORMAL' hoặc 'CONFIRMED_ERROR')
    │
    ├── 1. Set loading state
    │
    ├── 2. Gọi API cập nhật quantity
    │       PATCH /api/v1/comments/{commentId}
    │       Body: { quantity: currentQuantity + 1 }
    │
    ├── 3. Cập nhật UI: comment.quantity = newQuantity
    │
    ├── 4. Toast: "Đã cập nhật số lượng"
    │
    └── 5. Trigger in receipt với quantity mới
```

### 2.4. Logic in comment receipt

```typescript
// Pseudo-code cho Web
async function handlePrintComment(
    comment: Comment,
    actionType: 'NORMAL' | 'BACKUP' | 'CONFIRMED_ERROR' = 'NORMAL'
) {
    // 1. Lấy print settings (cache-first)
    const settings = await getCommentPrintSettings(token);
    
    // 2. Render receipt HTML
    const receiptHtml = renderCommentReceipt(comment, settings, actionType);
    
    // 3. In
    printHtml(receiptHtml); // window.print() hoặc iframe print
}
```

### 2.5. Layout hóa đơn Comment — CHÍNH XÁC từng phần

Hoá đơn comment được render theo thứ tự từ trên xuống dưới.
Mỗi section có thể bật/tắt qua Print Settings.

```
┌──────────────────────────────────────────────┐
│                                              │  ← padding-top: 40px
│                                              │
│            ╔══════════════════╗               │
│            ║   TÊN CỬA HÀNG  ║               │  ← font-size: 48px, bold, center
│            ╚══════════════════╝               │     [settings.storeInfo.name]
│                                              │
│        Địa chỉ: 123 Nguyễn Huệ, Q1          │  ← font-size: 20px, center
│                                              │     [settings.storeInfo.address]
│           Liên hệ: 0909 123 456             │  ← font-size: 20px, center
│                                              │     [settings.storeInfo.phone]
│ ──────────────────────────────────────────── │  ← divider (dashed line)
│                                              │  ← spacing: 65px
│                                              │
│            ╔══════════════════╗               │
│            ║   TÊN KHÁCH HÀNG ║               │  ← font-size: 48px, bold, center
│            ╚══════════════════╝               │     (comment.igUsername)
│                                              │
│          16/01/2021 01:01:01                 │  ← font-size: 28px, center
│                                              │     (comment.createdAt formatted)
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  *SP đã báo lỗi trên live*             │  │  ← CHỈ hiện khi actionType === 'CONFIRMED_ERROR'
│  │  *Dự bị cho {tên IG gốc}*             │  │  ← CHỈ hiện khi actionType === 'BACKUP'
│  └────────────────────────────────────────┘  │     font-size: 28px, bold, center
│                                              │
│ ═══════════════════════════════════════════  │
│                                              │
│  ┌── NẾU productInfo.productList === true ─┐ │
│  │                                         │ │
│  │  Danh sách sản phẩm            SL: 2   │ │  ← font-size: 28px, bold
│  │                                         │ │
│  │  1. Tên sản phẩm 1     X1  100,000 vnđ │ │  ← name: normal, pricing: bold
│  │  2. Tên sản phẩm 2     X2  200,000 vnđ │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌── NẾU productInfo.product === true      ─┐│
│  │   && productInfo.productList === false    ││
│  │                                          ││
│  │  Tên sản phẩm         X1  100,000 vnđ   ││  ← font-size: 40px (large)
│  │                                          ││     Hiển thị dạng single product
│  └──────────────────────────────────────────┘│
│                                              │
│ ──────────────────────────────────────────── │  ← divider
│                                              │
│            LIVETRACKER.VN                    │  ← font-size: 20px, bold, center
│  Quản lý Livestream bán hàng Instagram      │  ← font-size: 20px, center
│                                              │
│                                              │  ← padding-bottom: 80px
└──────────────────────────────────────────────┘
```

**Kích thước gốc (thermal printer 80mm):**
- Chiều rộng canvas: `576px` (80mm @ 203dpi)
- Padding ngang: `10px` mỗi bên
- Content width: `556px`

### 2.6. Các trường dữ liệu cần extract cho Comment Receipt

```typescript
// Từ Comment object
const customerName = comment.igUsername;      // Tên khách
const dateStr = formatDate(comment.createdAt); // "DD/MM/YYYY"
const timeStr = formatTime(comment.createdAt); // "HH:mm:ss"

// Products (từ comment trực tiếp)
const product = {
    name: comment.text,        // Nội dung comment = tên SP
    price: comment.price || 0,
    quantity: comment.quantity || 1,
};

// Backup info (chỉ khi actionType === 'BACKUP')
const backupTargetName = (comment.backupOf && typeof comment.backupOf === 'object')
    ? comment.backupOf.igUsername 
    : 'Tên IG gốc';

// Shop info (từ user profile / shop data)
const shopName = shop?.name || user?.shopName || 'MINI SHOP';
const shopAddress = shop?.address;
const shopPhone = shop?.phone;
```

### 2.7. UI buttons trên CommentItem theo status

```
┌─────────────────────────────────────────────────────────────┐
│ STATUS === null (chưa xử lý)                               │
│                                                             │
│  [📑 Dự bị]  [⚠️ Báo lỗi]          [    Chốt đơn    ]     │
│  (outline)   (outline, vàng)        (primary, filled)       │
│                                                             │
│  → Bấm "Chốt đơn" → tạo order (NORMAL) + in               │
│  → Bấm "Báo lỗi"  → tạo order (CONFIRMED_ERROR) + in      │
│  → Bấm "Dự bị"    → link backup (KHÔNG in)                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STATUS === 'NORMAL' hoặc 'CONFIRMED_ERROR'                  │
│                                                             │
│  [  In thêm (2)  ]              [    Hủy chốt    ]         │
│  (cam, filled)                  (đỏ, filled)               │
│                                                             │
│  → Bấm "In thêm"  → quantity+1, PATCH comment, in lại     │
│  → Bấm "Hủy chốt" → xoá comment khỏi order, status=null  │
│  → Số trong ngoặc = comment.quantity (nếu > 1)             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STATUS === 'BACKUP'                                         │
│                                                             │
│  [❌ Huỷ dự bị]                        (không có nút in)   │
│  (đỏ outline)                                               │
│                                                             │
│  → Badge "Dự bị" (cam) hiện bên cạnh timestamp             │
│  → Bấm "Huỷ dự bị" → unlink backup, status=null           │
└─────────────────────────────────────────────────────────────┘
```

### 2.8. Badges trên CommentItem

| Status | Badge | Màu |
|---|---|---|
| `null` | Không có | — |
| `NORMAL` | Không có badge (nhưng có nút In thêm / Hủy chốt) | — |
| `BACKUP` | "Dự bị" | Cam `#FF9500` |
| `CONFIRMED_ERROR` | "Đã báo lỗi" | Đỏ `#FF3B30` |

---

## 3. In hoá đơn đơn hàng

### 3.1. Khi nào in?

| Trường hợp | Trigger | Mô tả |
|---|---|---|
| **In đơn lẻ** | Bấm nút "In đơn" trên `OrderItem` → chọn mode | In 1 đơn hàng |
| **In batch** | Chọn nhiều đơn (checkbox) → bấm "In đơn" | In tuần tự nhiều đơn |
| **In sau khi tạo** | Sau khi chốt đơn từ comment | Auto-in order vừa tạo |

### 3.2. Ba chế độ in (PrintMode)

```typescript
type PrintMode = 'print_and_send' | 'print_only' | 'send_only';
```

| Mode | Label | Icon | Mô tả |
|---|---|---|---|
| `print_and_send` | "In + Gửi" | `printer-check` | In ra + Gửi ảnh bill cho KH qua IG DM **(MẶC ĐỊNH)** |
| `print_only` | "Chỉ in" | `printer` | Chỉ in ra, không gửi bill |
| `send_only` | "Chỉ gửi" | `send` | Không in, chỉ render ảnh → gửi API |

### 3.3. Flow in đơn hàng

```
User chọn đơn hàng → bấm "In đơn" → chọn PrintMode
    │
    ├── 1. Kiểm tra: có đơn nào được chọn?
    │       → Nếu không → return
    │
    ├── 2. Kiểm tra: đang in batch khác?
    │       → Nếu đúng → bỏ qua (guard)
    │
    ├── 3. Set trạng thái: isPrinting = true
    │       Set progress: { current: 0, total: selectedOrders.length }
    │
    ├── 4. Lấy Print Settings
    │       → getUnifiedOrderSettings(token)
    │       → Gồm API settings + local endNote settings
    │
    ├── 5. Loop từng order trong batch:
    │       │
    │       ├── MODE: send_only
    │       │   ├── Render receipt → base64 JPEG
    │       │   ├── Lấy igId từ order.customerId.igId
    │       │   ├── POST /orders/:id/send-bill (FormData: image + igUserId)
    │       │   └── Update progress
    │       │
    │       ├── MODE: print_only
    │       │   ├── Render receipt → HTML/PDF
    │       │   ├── Print (window.print / iframe)
    │       │   └── Update progress
    │       │
    │       └── MODE: print_and_send
    │           ├── Render receipt → HTML + base64
    │           ├── Print
    │           ├── POST /orders/:id/send-bill
    │           └── Update progress
    │
    └── 6. Reset state: isPrinting = false, progress = null
```

### 3.4. Layout hóa đơn Order — CHÍNH XÁC từng phần

```
┌──────────────────────────────────────────────┐
│                                              │  ← padding-top: 80px
│                                              │
│            ╔══════════════════╗               │
│            ║   TÊN CỬA HÀNG  ║               │  ← font-size: 48px, bold, center
│            ╚══════════════════╝               │     [settings.storeInfo.name]
│                                              │
│        Địa chỉ: 123 Nguyễn Huệ, Q1          │  ← font-size: 20px, center
│                                              │     [settings.storeInfo.address]
│           Liên hệ: 0909 123 456             │  ← font-size: 20px, center
│                                              │     [settings.storeInfo.phone]
│ ──────────────────────────────────────────── │  ← divider
│                                              │
│                                              │  ← spacing: 50px
│          ╔════════════════════════╗           │
│          ║   HOÁ ĐƠN BÁN HÀNG   ║           │  ← font-size: 40px, bold, center
│          ╚════════════════════════╝           │
│                                              │  ← spacing: 70px
│              ╔═══════════╗                   │
│              ║  #DH001   ║                   │  ← font-size: 40px, bold, center
│              ╚═══════════╝                   │     (order.orderCode || order._id.substring(0,8))
│ ──────────────────────────────────────────── │  ← divider
│                                              │
│  Ngày tạo:                16/01/2021 01:01:01│  ← font: 28px, left + right
│                                              │     [luôn hiển thị nếu có time]
│ ──────────────────────────────────────────── │  ← divider
│                                              │
│  Khách hàng:              tên_khách_hàng_ig  │  ← label: 28px, value: 40px bold
│                                              │     (order.customerId.igName)
│                                              │
│  SĐT:  0909123456                           │  ← [settings.customerInfo.phone]
│                                              │     label: 20px, value: 28px
│  ĐC:   123 Đường ABC, Phường XYZ,           │  ← [settings.customerInfo.address]
│         Quận 1                               │     (word-wrapped)
│                                              │     Ghép: customer.street, ward, province
│ ──────────────────────────────────────────── │  ← divider
│                                              │
│ ┌── NẾU productInfo.productList === true ──┐ │
│ │                                          │ │
│ │  Danh sách sản phẩm              SL: 3  │ │  ← font: 28px, bold
│ │                                          │ │     totalQuantity = order.totalQuantity
│ │  1. Comment CHỐT ĐƠN 1  X1  100,000 vnđ │ │     hoặc sum(product.quantity)
│ │  2. Comment CHỐT ĐƠN 2  X2  200,000 vnđ │ │
│ │  3. Comment CHỐT ĐƠN 3  X1  150,000 vnđ │ │  ← name: 28px normal (word-wrap)
│ │                                          │ │     pricing: 28px bold, right-aligned
│ └──────────────────────────────────────────┘ │
│                                              │
│ ──────────────────────────────────────────── │  ← divider (chỉ khi có totalAmount)
│                                              │
│ ┌── NẾU productInfo.totalAmount === true ──┐ │
│ │                                          │ │
│ │  Tổng tiền:               450,000 vnđ   │ │  ← label: 28px bold
│ │                                          │ │     value: 40px bold, right-aligned
│ │                                          │ │     = order.totalPrice hoặc sum(p * q)
│ │  ┌── NẾU order có cọc (depositStatus) ─┐│ │
│ │  │                                      ││ │
│ │  │  Tiền cọc:          - 100,000 vnđ   ││ │  ← font: 28px normal / 40px normal
│ │  │                                      ││ │
│ │  │  Còn lại:             350,000 vnđ   ││ │  ← font: 28px bold / 40px bold
│ │  │                                      ││ │     = order.remainingTotal
│ │  └──────────────────────────────────────┘│ │     hoặc totalPrice - deposit
│ │                                          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ──────────────────────────────────────────── │  ← divider
│                                              │
│            LIVETRACKER.VN                    │  ← font-size: 20px, bold, center
│  Quản lý Livestream bán hàng Instagram      │  ← font-size: 20px, center
│                                              │
│                                              │  ← padding-bottom: 150px
└──────────────────────────────────────────────┘
```

### 3.5. Dữ liệu cần extract cho Order Invoice

```typescript
// ═══════════════════════════════════════════
// SHOP INFO (từ user profile)
// ═══════════════════════════════════════════

// Tìm shop cụ thể theo shopId của order
const shopId = order.shopId 
    || (order.liveId && typeof order.liveId === 'object' ? order.liveId.shopId : null);

const specificShop = user.shops?.find(s => String(s.id) === String(shopId));

const shopName = specificShop?.name || user.shop?.name || user.shops?.[0]?.name || user.shopName || user.fullName || 'MINI SHOP';
const shopAddress = specificShop?.address;
const shopPhone = specificShop?.phone;

// ═══════════════════════════════════════════
// ORDER INFO
// ═══════════════════════════════════════════

const orderCode = order.orderCode || order._id.substring(0, 8).toUpperCase();
const dateStr = formatDate(order.createdAt);  // "DD/MM/YYYY"
const timeStr = formatTime(order.createdAt);  // "HH:mm:ss"

// ═══════════════════════════════════════════
// CUSTOMER INFO (order.customerId populated)
// ═══════════════════════════════════════════

const customer = order.customerId as Customer;
const customerName = customer?.igName || '';
const customerPhone = customer?.phone || '';
const customerAddress = [customer?.street, customer?.ward, customer?.province]
    .filter(Boolean)
    .join(', ');

// ═══════════════════════════════════════════
// PRODUCTS (từ order.commentIds populated)
// ═══════════════════════════════════════════

const products = (order.commentIds as Comment[])
    .filter(comment => typeof comment === 'object' && comment !== null)
    .filter(comment => comment.status !== 'BACKUP')     // ⚠️ LOẠI BỎ comment dự bị
    .map((comment, index) => ({
        id: `SP${String(index + 1).padStart(2, '0')}`,
        name: comment.text || `Product ${index + 1}`,   // Nội dung comment = tên SP
        price: comment.price || 0,
        quantity: comment.quantity || 1,
    }));

// ═══════════════════════════════════════════
// TOTALS
// ═══════════════════════════════════════════

const totalQuantity = order.totalQuantity 
    ?? products.reduce((sum, p) => sum + p.quantity, 0);

const totalAmount = order.totalPrice 
    ?? products.reduce((sum, p) => sum + p.price * p.quantity, 0);

// Deposit
const hasDeposit = !!order.depositStatus && order.deposit && order.deposit > 0;
const depositAmount = order.deposit || 0;
const remainingAmount = order.remainingTotal ?? (totalAmount - depositAmount);
```

### 3.6. Gửi bill cho khách hàng (Send Bill)

```
POST /api/v1/orders/:orderId/send-bill

Content-Type: multipart/form-data

Fields:
  - image: File (JPEG hoặc PNG) — ảnh hoá đơn
  - igUserId: string — Instagram User ID của khách hàng

Response:
  - 200: { success: true, message: "Bill sent successfully" }

Lưu ý Web:
  - Trên web, render receipt thành canvas → toBlob() → FormData
  - Hoặc dùng html2canvas → convert sang JPEG blob
```

### 3.7. UI OrderItem — Buttons & Actions

```
┌─────────────────────────────────────────────────┐
│  ☐  tên_khách_hàng          [Đã cọc]    ⋮     │  ← Header
│     📞 0909123456                               │
├─────────────────────────────────────────────────┤
│  Mã đơn hàng:              DH001               │  ← Metadata
│  Tổng tiền:                450,000 vnđ          │
│  Ngày tạo:                 10/04/2026           │
├─────────────────────────────────────────────────┤
│  [🚚 Giao hàng]     [🖨️ In đơn ▾]             │  ← Action buttons
│                                                 │     Bấm ▾ → PrintModeDropdown
└─────────────────────────────────────────────────┘

PrintModeDropdown (xuất hiện khi bấm ▾):
┌─────────────────────┐
│ 🖨️✓ In + Gửi  MẶC ĐỊNH │
├─────────────────────┤
│ 🖨️  Chỉ in          │
├─────────────────────┤
│ 📩  Chỉ gửi          │
└─────────────────────┘
```

### 3.8. Batch Print Progress

Khi in nhiều đơn cùng lúc, hiển thị progress:

```typescript
interface PrintProgress {
    current: number;  // Đơn đang in (1-based)
    total: number;    // Tổng số đơn
}

// UI: "Đang in 3/10..."
// Có thể dùng progress bar hoặc toast notification
```

**Logic batch:**
- In tuần tự (từng đơn một), không song song
- Delay 300ms giữa các đơn
- Nếu 1 đơn lỗi → log error, hiện alert, tiếp tục đơn tiếp theo
- Guard: không cho in chồng (nếu đang in batch → bỏ qua yêu cầu mới)

---

## 4. Print Template Settings

### 4.1. API Endpoints

```
GET  /api/v1/users/me/print-template   → Lấy settings hiện tại
PATCH /api/v1/users/me/print-template   → Cập nhật settings
```

### 4.2. Response Format

```typescript
interface PrintTemplateResponse {
    // Template mới (ưu tiên sử dụng)
    orderTemplate?: {
        shopInfo: {
            name: boolean;     // Hiện tên shop?
            address: boolean;  // Hiện địa chỉ shop?
            phone: boolean;    // Hiện SĐT shop?
        };
        customerInfo: {
            address: boolean;  // Hiện địa chỉ KH?
            phone: boolean;    // Hiện SĐT KH?
        };
        productInfo: {
            productList: boolean;  // Hiện danh sách SP?
            totalAmount: boolean;  // Hiện tổng tiền?
        };
    };
    commentTemplate?: {
        shopInfo: {
            name: boolean;
            address: boolean;
            phone: boolean;
        };
        productInfo: {
            product: boolean;   // Hiện tên SP?
            quantity: boolean;  // Hiện số lượng?
            price: boolean;     // Hiện giá?
        };
    };
    
    // Legacy format (backward compatibility — có thể bỏ qua trên Web)
    comment?: LegacyPrintTemplate;
    order?: LegacyPrintTemplate;
}
```

### 4.3. Default Values

```typescript
// Order Template defaults
const DEFAULT_ORDER_TEMPLATE = {
    shopInfo:     { name: true,  address: true,  phone: true },
    customerInfo: { address: true,  phone: true },
    productInfo:  { productList: true, totalAmount: true },
};

// Comment Template defaults  
const DEFAULT_COMMENT_TEMPLATE = {
    shopInfo:     { name: true,  address: true,  phone: true },
    productInfo:  { product: true, quantity: true, price: true },
};
```

### 4.4. Update (PATCH) Payload

```typescript
// Cập nhật Order template
PATCH /api/v1/users/me/print-template
Body: {
    "orderTemplate": {
        "shopInfo": { "name": true, "address": false, "phone": true },
        "customerInfo": { "address": true, "phone": false },
        "productInfo": { "productList": true, "totalAmount": true }
    }
}

// Cập nhật Comment template
PATCH /api/v1/users/me/print-template
Body: {
    "commentTemplate": {
        "shopInfo": { "name": true, "address": false, "phone": true },
        "productInfo": { "product": true, "quantity": true, "price": false }
    }
}
```

### 4.5. Mapping API → Internal Settings

```typescript
// API response → PrintContentSettings (dùng cho render)
function mapPrintTemplateToSettings(
    template: PrintTemplateResponse, 
    type: 'order' | 'comment'
): PrintContentSettings {
    
    if (type === 'order' && template.orderTemplate) {
        const t = template.orderTemplate;
        return {
            storeInfo: {
                name: t.shopInfo.name,
                address: t.shopInfo.address,
                phone: t.shopInfo.phone,
            },
            customerInfo: {
                address: t.customerInfo.address,
                phone: t.customerInfo.phone,
            },
            productInfo: {
                product: t.productInfo.productList,
                quantity: t.productInfo.productList,
                price: t.productInfo.productList,
                productList: t.productInfo.productList,
                totalAmount: t.productInfo.totalAmount,
            },
        };
    }
    
    if (type === 'comment' && template.commentTemplate) {
        const t = template.commentTemplate;
        return {
            storeInfo: {
                name: t.shopInfo.name,
                address: t.shopInfo.address,
                phone: t.shopInfo.phone,
            },
            customerInfo: {
                address: false,  // Comment không có address KH
                phone: false,    // Comment không có phone KH
            },
            productInfo: {
                product: t.productInfo.product,
                quantity: t.productInfo.quantity,
                price: t.productInfo.price,
                productList: false,    // Comment dùng single product
                totalAmount: false,    // Comment không có total
            },
        };
    }
}
```

### 4.6. UI Màn hình Settings — 2 Tab

```
┌────────────────────────────────────────────┐
│  [  📋 Đơn hàng  ]  [  📝 In bình luận  ] │  ← Tabs
├────────────────────────────────────────────┤
│                                            │
│  THÔNG TIN CỬA HÀNG                       │
│  ┌────────────────────────────────────┐    │
│  │ ☑ Tên                              │    │
│  │ ☐ Địa chỉ                          │    │
│  │ ☑ Số điện thoại                     │    │
│  └────────────────────────────────────┘    │
│                                            │
│  THÔNG TIN KHÁCH HÀNG (chỉ tab Đơn hàng)  │
│  ┌────────────────────────────────────┐    │
│  │ ☑ Địa chỉ                          │    │
│  │ ☑ Số điện thoại                     │    │
│  └────────────────────────────────────┘    │
│                                            │
│  THÔNG TIN SẢN PHẨM                       │
│  ┌────── Tab Đơn hàng ──────────────┐     │
│  │ ☑ Danh sách sản phẩm              │     │
│  │ ☑ Tổng tiền                        │     │
│  └────────────────────────────────────┘    │
│  ┌────── Tab In bình luận ──────────┐     │
│  │ ☑ Sản phẩm                        │     │
│  │ ☑ Số lượng                         │     │
│  │ ☑ Giá                              │     │
│  └────────────────────────────────────┘    │
│                                            │
│  HOÁ ĐƠN THEO LỰA CHỌN                   │
│  ┌────────────────────────────────────┐    │
│  │     (Preview hóa đơn render live)  │    │  ← Live preview cập nhật khi toggle
│  └────────────────────────────────────┘    │
│                                            │
│  ┌────────────────────────────────────┐    │
│  │           [  💾 Lưu  ]             │    │  ← Gọi PATCH API
│  └────────────────────────────────────┘    │
└────────────────────────────────────────────┘

Test options (chỉ tab "In bình luận"):
  ☐ Test: Dự bị        → preview hiện dòng "*Dự bị cho {tên}*"
  ☐ Test: Đã báo lỗi   → preview hiện dòng "*SP đã báo lỗi trên live*"
```

---

## 5. Data Types & Interfaces

### 5.1. Comment

```typescript
interface Comment {
    _id: string;
    commentId?: string;
    igUserId?: string;           // Instagram User ID
    igUsername: string;           // Instagram username
    text: string;                // Nội dung comment (= tên sản phẩm)
    quantity?: number;           // Số lượng (default: 1)
    price?: number;              // Giá (VNĐ)
    isNewCustomer?: boolean;     // Khách mới?
    customerClosedCount?: number;// Số đơn đã chốt của KH
    liveId?: string;
    status: 'NORMAL' | 'BACKUP' | 'CONFIRMED_ERROR' | null;
    customerTag?: Tag | null;    // Tag gắn cho KH
    backupOf?: string | { _id: string; igUsername?: string; text?: string } | null;
    createdAt: string;           // ISO 8601
    updatedAt?: string;
}
```

### 5.2. Order

```typescript
interface Order {
    _id: string;
    orderCode?: string;          // Mã đơn hàng (auto-generated)
    customerId?: string | Customer;  // Populated Customer object
    liveId?: string | LiveStream;
    userId?: string | User;
    commentIds?: string[] | Comment[];  // Populated Comments (= sản phẩm)
    deposit?: number;            // Tiền cọc (VNĐ)
    depositStatus?: string;      // "đã cọc" nếu có cọc
    remainingTotal?: number;     // Tổng sau trừ cọc
    totalPrice?: number;         // Tổng trước cọc
    totalQuantity?: number;      // Tổng số lượng
    status?: string;
    quantity?: number;
    isNewCustomer?: boolean;
    createdAt?: string;
    updatedAt?: string;
}
```

### 5.3. Customer

```typescript
interface Customer {
    _id: string;
    igId: string;                // Instagram ID
    igName: string;              // Instagram display name
    tagId?: string | Tag;
    tag?: Tag;
    phone: string;
    street: string;              // Số nhà, đường
    ward: string;                // Phường/Xã
    province: string;            // Tỉnh/TP
    dayOfBirth: string;
    note: string;
    orderHistories?: string[] | Order[];
    createdAt?: string;
    updatedAt?: string;
}
```

### 5.4. PrintContentSettings

```typescript
interface PrintContentSettings {
    storeInfo: {
        name: boolean;       // Hiện tên cửa hàng?
        address: boolean;    // Hiện địa chỉ cửa hàng?
        phone: boolean;      // Hiện SĐT cửa hàng?
    };
    customerInfo: {
        address: boolean;    // Hiện địa chỉ KH?
        phone: boolean;      // Hiện SĐT KH?
    };
    productInfo: {
        product: boolean;    // Hiện tên SP? (comment mode)
        quantity: boolean;   // Hiện SL? (comment mode)
        price: boolean;      // Hiện giá? (comment mode)
        productList: boolean;// Hiện danh sách SP? (order mode)
        totalAmount: boolean;// Hiện tổng tiền? (order mode)
    };
    endNote?: string;        // Ghi chú cuối
    endNoteEnabled?: boolean;// Bật ghi chú cuối?
}
```

### 5.5. User (shop info fields)

```typescript
interface User {
    _id: string;
    fullName?: string;
    shopName?: string;
    shop?: {
        id: string;
        name: string;
        avatar?: string;
        phone?: string;
        address?: string;
    };
    shops?: Array<{
        id: string;
        name: string;
        avatar?: string;
        phone?: string;
        address?: string;
    }>;
    // ... other fields
}
```

### 5.6. Tag

```typescript
interface Tag {
    _id: string;
    label: string;
    color?: string;
    userId?: string;
    createdAt?: string;
    updatedAt?: string;
}
```

### 5.7. CreateOrderRequest

```typescript
interface CreateOrderRequest {
    igId: string;                // Instagram User ID của KH
    igName: string;              // Instagram username
    liveId: string;              // ID của livestream
    commentId: string;           // ID comment được chốt
    commentIds?: string[];       // Nhiều comments (optional)
    actionType?: 'NORMAL' | 'BACKUP' | 'CONFIRMED_ERROR';
    isNewCustomer?: boolean;
}
```

### 5.8. PrintMode

```typescript
type PrintMode = 'print_and_send' | 'print_only' | 'send_only';

// PrintModeDropdown options:
const PRINT_MODE_OPTIONS = [
    { mode: 'print_and_send', label: 'In + Gửi',  icon: 'printer-check', isDefault: true },
    { mode: 'print_only',     label: 'Chỉ in',    icon: 'printer' },
    { mode: 'send_only',      label: 'Chỉ gửi',   icon: 'send' },
];
```

---

## 6. API Endpoints chi tiết

### 6.1. Orders

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/v1/orders` | Tạo order mới từ comment |
| `GET` | `/api/v1/orders/:id` | Lấy chi tiết order (populated) |
| `PATCH` | `/api/v1/orders/:id` | Cập nhật order (deposit, etc.) |
| `DELETE` | `/api/v1/orders/:id` | Xoá order |
| `POST` | `/api/v1/orders/:id/send-bill` | Gửi bill cho KH (multipart/form-data) |
| `DELETE` | `/api/v1/orders/:id/comments/:commentId` | Xoá comment khỏi order (huỷ chốt) |
| `POST` | `/api/v1/orders/:id/manual-comment` | Thêm SP thủ công vào order |
| `GET` | `/api/v1/orders/user/my-orders` | Lấy danh sách đơn của tôi |

### 6.2. Comments

| Method | Endpoint | Mô tả |
|---|---|---|
| `PATCH` | `/api/v1/comments/:id` | Cập nhật comment (quantity, etc.) |
| `GET` | `/api/v1/comments/live/:liveId/cursor` | Lấy comments theo cursor |

### 6.3. Print Template

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/v1/users/me/print-template` | Lấy print settings |
| `PATCH` | `/api/v1/users/me/print-template` | Cập nhật print settings |

### 6.4. User/Shop Info

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/v1/users/me` | Lấy user profile (gồm shops) |
| `GET` | `/api/v1/users/me/shops` | Lấy danh sách shops |

---

## 7. Hướng dẫn triển khai trên NextJS

### 7.1. Chiến lược render hóa đơn trên Web

Có 2 cách tiếp cận:

#### Cách 1: HTML/CSS + `window.print()` (⭐ Khuyến nghị)

```
Ưu điểm: Đơn giản, text sắc nét, hỗ trợ UTF-8 tốt
Nhược điểm: Phụ thuộc CSS @media print, user phải confirm dialog

Flow:
1. Render receipt thành React component (hidden hoặc trong iframe)
2. Áp dụng CSS @media print để format cho giấy nhiệt
3. Gọi window.print() hoặc iframe.contentWindow.print()
```

#### Cách 2: html2canvas → Blob → Download/Send

```
Ưu điểm: Giống 100% mobile (ảnh bitmap), không phụ thuộc print dialog
Nhược điểm: Cần thêm library, nặng hơn

Flow:
1. Render receipt thành React component (visible trong DOM)
2. html2canvas(element) → Canvas → toBlob('image/jpeg')
3. Download hoặc upload lên API send-bill
```

### 7.2. Component Structure gợi ý

```
components/
├── print/
│   ├── ReceiptRenderer.tsx         # Core component render hoá đơn
│   ├── CommentReceipt.tsx          # Layout hoá đơn comment
│   ├── OrderReceipt.tsx            # Layout hoá đơn order
│   ├── PrintPreviewModal.tsx       # Modal preview trước khi in
│   ├── PrintModeDropdown.tsx       # Dropdown chọn mode in
│   └── PrintSettingsPanel.tsx      # Panel cài đặt nội dung in
│
hooks/
├── usePrintSettings.ts             # Hook quản lý print settings (API + cache)
├── usePrintReceipt.ts              # Hook render + in receipt
└── useOrderPrinting.ts             # Hook in batch đơn hàng
│
lib/
└── printUtils.ts                   # Format currency, date, etc.
```

### 7.3. CSS cho Receipt (tương đương Skia render)

```css
/* Receipt Container */
.receipt {
    width: 576px;                    /* 80mm @ 203dpi — giữ nguyên */
    padding: 0 10px;                 /* PADDING_H = 10 */
    background: white;
    font-family: 'Arial', 'Helvetica', sans-serif;
    color: #000000;
}

/* Tương đương các font size trong Skia */
.receipt .title    { font-size: 48px; font-weight: 700; }  /* FONT_SIZE_TITLE */
.receipt .large    { font-size: 40px; font-weight: 400; }  /* FONT_SIZE_LARGE */
.receipt .normal   { font-size: 28px; font-weight: 400; }  /* FONT_SIZE_NORMAL */
.receipt .small    { font-size: 20px; font-weight: 400; }  /* FONT_SIZE_SMALL */

.receipt .bold     { font-weight: 700; }

/* Line heights */
.receipt .lh-title  { line-height: 48px; }   /* LINE_HEIGHT_TITLE */
.receipt .lh-large  { line-height: 50px; }   /* LINE_HEIGHT_LARGE */
.receipt .lh-normal { line-height: 36px; }   /* LINE_HEIGHT_NORMAL */
.receipt .lh-small  { line-height: 20px; }   /* LINE_HEIGHT_SMALL */

/* Text alignment */
.receipt .text-center { text-align: center; }
.receipt .text-left   { text-align: left; }
.receipt .text-right  { text-align: right; }

/* Divider (dashed line) */
.receipt .divider {
    border: none;
    border-top: 0.5px solid #000;
    margin: 6px 0;
}

/* Row: label left, value right */
.receipt .row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

/* Product item */
.receipt .product-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.receipt .product-name {
    flex: 1;
    word-wrap: break-word;
    font-size: 28px;
}

.receipt .product-pricing {
    white-space: nowrap;
    font-size: 28px;
    font-weight: 700;
    margin-left: 30px;
}

/* Scaling cho web display
   Receipt gốc 576px — scale xuống fit container */
.receipt-wrapper {
    width: 100%;
    max-width: 400px;       /* Hoặc responsive */
    margin: 0 auto;
}

.receipt-wrapper .receipt {
    transform-origin: top left;
    transform: scale(calc(400 / 576));  /* Scale to fit */
}
```

### 7.4. Format Utilities

```typescript
// Format ngày tháng
function formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Format giờ
function formatTime(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Format tiền VNĐ
function formatCurrency(amount: number): string {
    return amount.toLocaleString('vi-VN') + ' vnđ';
}
```

### 7.5. React Component Example — CommentReceipt

```tsx
interface CommentReceiptProps {
    comment: Comment;
    settings: PrintContentSettings;
    shopInfo: { name: string; address?: string; phone?: string };
    actionType?: 'NORMAL' | 'BACKUP' | 'CONFIRMED_ERROR';
}

function CommentReceipt({ comment, settings, shopInfo, actionType }: CommentReceiptProps) {
    return (
        <div className="receipt" id="comment-receipt">
            {/* ── Shop Header ── */}
            {(settings.storeInfo.name || settings.storeInfo.address || settings.storeInfo.phone) && (
                <div style={{ paddingTop: 40 }}>
                    {settings.storeInfo.name && shopInfo.name && (
                        <div className="title text-center">{shopInfo.name}</div>
                    )}
                    {settings.storeInfo.address && shopInfo.address && (
                        <div className="small text-center">Địa chỉ: {shopInfo.address}</div>
                    )}
                    {settings.storeInfo.phone && shopInfo.phone && (
                        <div className="small text-center">Liên hệ: {shopInfo.phone}</div>
                    )}
                    <hr className="divider" />
                </div>
            )}

            {/* ── Customer Name + Date ── */}
            <div style={{ marginTop: 65, textAlign: 'center' }}>
                <div className="title">{comment.igUsername}</div>
                <div className="normal" style={{ marginTop: 20 }}>
                    {formatDate(comment.createdAt)} {formatTime(comment.createdAt)}
                </div>
            </div>

            {/* ── Action Type Badge ── */}
            {actionType === 'CONFIRMED_ERROR' && (
                <div className="normal bold text-center" style={{ marginTop: 10 }}>
                    *SP đã báo lỗi trên live*
                </div>
            )}
            {actionType === 'BACKUP' && (
                <div className="normal bold text-center" style={{ marginTop: 10 }}>
                    *Dự bị cho {getBackupTargetName(comment)}*
                </div>
            )}

            {/* ── Product (single mode) ── */}
            {settings.productInfo.product && !settings.productInfo.productList && (
                <div style={{ marginTop: 30 }}>
                    <div className="row">
                        <span className="large">{comment.text}</span>
                        <span className="large">
                            {settings.productInfo.quantity && `X${comment.quantity || 1}`}
                            {settings.productInfo.price && `  ${formatCurrency((comment.price || 0) * (comment.quantity || 1))}`}
                        </span>
                    </div>
                </div>
            )}

            {/* ── Footer ── */}
            <hr className="divider" />
            <div className="text-center" style={{ paddingBottom: 80 }}>
                <div className="small bold">LIVETRACKER.VN</div>
                <div className="small">Quản lý Livestream bán hàng Instagram</div>
            </div>
        </div>
    );
}
```

### 7.6. React Component Example — OrderReceipt

```tsx
interface OrderReceiptProps {
    order: Order;
    settings: PrintContentSettings;
    shopInfo: { name: string; address?: string; phone?: string };
}

function OrderReceipt({ order, settings, shopInfo }: OrderReceiptProps) {
    const customer = order.customerId as Customer;
    const products = getProducts('order', order);
    const orderCode = order.orderCode || order._id.substring(0, 8).toUpperCase();
    
    const totalAmount = order.totalPrice 
        ?? products.reduce((sum, p) => sum + p.price * p.quantity, 0);
    
    const hasDeposit = !!order.depositStatus && order.deposit && order.deposit > 0;
    const remaining = order.remainingTotal ?? (totalAmount - (order.deposit || 0));

    return (
        <div className="receipt" id="order-receipt">
            {/* ── Shop Header ── */}
            <div style={{ paddingTop: 80 }}>
                {settings.storeInfo.name && shopInfo.name && (
                    <div className="title text-center">{shopInfo.name}</div>
                )}
                {settings.storeInfo.address && shopInfo.address && (
                    <div className="small text-center">Địa chỉ: {shopInfo.address}</div>
                )}
                {settings.storeInfo.phone && shopInfo.phone && (
                    <div className="small text-center">Liên hệ: {shopInfo.phone}</div>
                )}
                <hr className="divider" />
            </div>

            {/* ── Invoice Title ── */}
            <div style={{ marginTop: 50, textAlign: 'center' }}>
                <div className="large bold">HOÁ ĐƠN BÁN HÀNG</div>
                <div className="large bold" style={{ marginTop: 70 }}>#{orderCode}</div>
                <hr className="divider" />
            </div>

            {/* ── Date ── */}
            <div className="row" style={{ marginTop: 70 }}>
                <span className="normal">Ngày tạo:</span>
                <span className="normal">
                    {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                </span>
            </div>
            <hr className="divider" />

            {/* ── Customer Info ── */}
            <div style={{ marginTop: 70 }}>
                <div className="row">
                    <span className="normal">Khách hàng:</span>
                    <span className="large bold">{customer?.igName || ''}</span>
                </div>
                {settings.customerInfo.phone && customer?.phone && (
                    <div className="row">
                        <span className="small">SĐT:</span>
                        <span className="normal">{customer.phone}</span>
                    </div>
                )}
                {settings.customerInfo.address && (
                    <div>
                        <span className="small">ĐC:</span>
                        <span className="normal" style={{ marginLeft: 60 }}>
                            {[customer?.street, customer?.ward, customer?.province]
                                .filter(Boolean).join(', ')}
                        </span>
                    </div>
                )}
            </div>
            <hr className="divider" />

            {/* ── Product List ── */}
            {settings.productInfo.productList && products.length > 0 && (
                <div style={{ marginTop: 40 }}>
                    <div className="row">
                        <span className="normal bold">Danh sách sản phẩm</span>
                        <span className="normal bold">
                            SL: {order.totalQuantity ?? products.reduce((s, p) => s + p.quantity, 0)}
                        </span>
                    </div>
                    <div style={{ marginTop: 30 }}>
                        {products.map((product, i) => (
                            <div key={i} className="product-item">
                                <span className="product-name">
                                    {i + 1}. {product.name}
                                </span>
                                <span className="product-pricing">
                                    X{product.quantity}   {formatCurrency(product.price * product.quantity)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Total ── */}
            {settings.productInfo.totalAmount && (
                <>
                    <hr className="divider" />
                    <div className="row" style={{ marginTop: 50 }}>
                        <span className="normal bold">Tổng tiền:</span>
                        <span className="large bold">{formatCurrency(totalAmount)}</span>
                    </div>

                    {hasDeposit && (
                        <>
                            <div className="row" style={{ marginTop: 40 }}>
                                <span className="normal">Tiền cọc:</span>
                                <span className="large">- {formatCurrency(order.deposit!)}</span>
                            </div>
                            <div className="row" style={{ marginTop: 60 }}>
                                <span className="normal bold">Còn lại:</span>
                                <span className="large bold">{formatCurrency(remaining)}</span>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ── Footer ── */}
            <hr className="divider" />
            <div className="text-center" style={{ paddingBottom: 150 }}>
                <div className="small bold">LIVETRACKER.VN</div>
                <div className="small">Quản lý Livestream bán hàng Instagram</div>
            </div>
        </div>
    );
}
```

### 7.7. Print Utility — In từ HTML

```typescript
/**
 * In receipt bằng cách tạo iframe ẩn, inject HTML/CSS, rồi print
 */
function printReceiptHtml(receiptElement: HTMLElement): void {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page { 
                    size: 80mm auto;  /* Giấy nhiệt */
                    margin: 0; 
                }
                body { margin: 0; padding: 0; }
                /* Paste receipt CSS here */
            </style>
        </head>
        <body>
            ${receiptElement.outerHTML}
        </body>
        </html>
    `);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    // Cleanup
    setTimeout(() => document.body.removeChild(iframe), 1000);
}

/**
 * Render receipt thành ảnh (cho send-bill API)
 * Dùng html2canvas library
 */
async function renderReceiptToImage(receiptElement: HTMLElement): Promise<Blob> {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(receiptElement, {
        width: 576,
        backgroundColor: '#ffffff',
        scale: 1,
    });
    
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Cannot convert to blob')),
            'image/jpeg',
            0.6  // JPEG quality 60% (giống mobile)
        );
    });
}

/**
 * Gửi bill cho khách hàng
 */
async function sendBillToCustomer(
    orderId: string, 
    receiptElement: HTMLElement, 
    igUserId: string,
    token: string
): Promise<void> {
    const imageBlob = await renderReceiptToImage(receiptElement);
    
    const formData = new FormData();
    formData.append('image', imageBlob, `bill_${orderId}.jpg`);
    formData.append('igUserId', igUserId);
    
    await fetch(`/api/v1/orders/${orderId}/send-bill`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
    });
}
```

### 7.8. Caching Print Settings

```typescript
const PRINT_SETTINGS_CACHE_KEY = 'print_settings_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

// Memory cache (same session)
const memoryCache: Map<string, { settings: PrintContentSettings; timestamp: number }> = new Map();

async function getPrintSettings(
    type: 'order' | 'comment', 
    token: string
): Promise<PrintContentSettings> {
    // 1. Check memory cache
    const cached = memoryCache.get(type);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        return cached.settings;
    }

    // 2. Check localStorage
    try {
        const stored = localStorage.getItem(PRINT_SETTINGS_CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed[type]) {
                memoryCache.set(type, { settings: parsed[type], timestamp: Date.now() });
                return parsed[type];
            }
        }
    } catch {}

    // 3. Fetch from API
    const response = await fetch('/api/v1/users/me/print-template', {
        headers: { 'Authorization': `Bearer ${token}` },
    });
    const template = await response.json();
    const settings = mapPrintTemplateToSettings(template.data, type);

    // Save cache
    memoryCache.set(type, { settings, timestamp: Date.now() });
    try {
        const stored = JSON.parse(localStorage.getItem(PRINT_SETTINGS_CACHE_KEY) || '{}');
        stored[type] = settings;
        localStorage.setItem(PRINT_SETTINGS_CACHE_KEY, JSON.stringify(stored));
    } catch {}

    return settings;
}

// Invalidate cache khi user thay đổi settings
function invalidatePrintCache(type?: 'order' | 'comment') {
    if (type) {
        memoryCache.delete(type);
    } else {
        memoryCache.clear();
    }
    // Optionally clear localStorage cache too
}
```

---

## Phụ lục: Checklist triển khai

### Phase 1: Core Receipt Rendering
- [ ] Tạo `CommentReceipt` component
- [ ] Tạo `OrderReceipt` component
- [ ] Tạo receipt CSS (576px width, font sizes, dividers)
- [ ] Format utilities: `formatDate`, `formatTime`, `formatCurrency`
- [ ] `printReceiptHtml()` utility (iframe print)

### Phase 2: Comment Actions
- [ ] Nút "Chốt đơn" → POST `/orders` → in comment receipt
- [ ] Nút "Đã báo lỗi" → POST `/orders` (actionType: CONFIRMED_ERROR) → in
- [ ] Nút "In thêm" → PATCH `/comments/:id` (quantity+1) → in
- [ ] Nút "Hủy chốt" → DELETE `/orders/:id/comments/:commentId`
- [ ] UI: Badge theo status (Dự bị / Đã báo lỗi)

### Phase 3: Order Actions
- [ ] Nút "In đơn" + PrintModeDropdown
- [ ] Batch print (chọn nhiều đơn, in tuần tự)
- [ ] Print progress indicator
- [ ] Send bill API integration (multipart/form-data)

### Phase 4: Print Settings
- [ ] GET/PATCH print-template API integration
- [ ] Settings UI: 2 tabs (Order / Comment)
- [ ] Live preview component
- [ ] Cache layer (memory + localStorage)

### Phase 5: Polish
- [ ] Print preview modal (xem trước khi in)
- [ ] Error handling & toast notifications
- [ ] Responsive scaling cho receipt preview
- [ ] Test tất cả biến thể (NORMAL, BACKUP, CONFIRMED_ERROR, có cọc, không cọc)
