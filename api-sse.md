# Tài liệu API & SSE Hoàn chỉnh - LiveTracker (100% Coverage)

Tài liệu này là nguồn tham chiếu duy nhất (Single Source of Truth) cho đội ngũ phát triển Frontend, bao quát toàn bộ các API và luồng dữ liệu thời gian thực của hệ thống LiveTracker.

> **Base URL**: `/api/v1`
> **Auth Header**: `Authorization: Bearer <accessToken>` (bắt buộc trừ các endpoint Public)
> **Response chung**: `{ success: boolean, message?: string, data: any }`

---

## 🔐 NHÓM 1: XÁC THỰC & KẾT NỐI (IDENTITY & ACCESS)

### 1.1 Xác thực Người dùng (Auth)

#### `POST /auth/register`
Đăng ký tài khoản mới.
- **Auth**: Không cần
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "role": ["User"],
    "username": "nguyenvana",
    "fullName": "Nguyen Van A"
  }
  ```
- **Response (201)**:
  ```json
  {
    "success": true,
    "message": "Tài khoản tạo thành công",
    "data": { "userId": "65f2...", "email": "user@example.com" }
  }
  ```

---

#### `POST /auth/register-admin`
Đăng ký tài khoản Admin (chỉ Admin hiện tại mới được tạo).
- **Auth**: Bearer Token (Role: Admin)
- **Request Body**: Giống `POST /auth/register`
- **Response (201)**: Giống `POST /auth/register`

---

#### `POST /auth/login`
Đăng nhập bằng email.
- **Auth**: Không cần
- **Request Body**:
  ```json
  { "email": "user@example.com", "password": "password123" }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "tokens": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
    }
  }
  ```

---

#### `POST /auth/refresh-token`
Làm mới access token.
- **Auth**: Không cần
- **Request Body**:
  ```json
  { "refreshToken": "eyJ..." }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "tokens": { "accessToken": "eyJ...", "refreshToken": "eyJ..." }
    }
  }
  ```

---

#### `POST /auth/logout`
Đăng xuất, vô hiệu hóa token.
- **Auth**: Bearer Token
- **Request Body**: `{}` (có thể gửi empty)
- **Response (200)**:
  ```json
  { "success": true, "message": "Đăng xuất thành công" }
  ```

---

#### `POST /auth/register-device`
Đăng ký device token để nhận push notification (FCM/Expo).
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "token": "fcm-device-token-xxxxx" }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "message": "Device registered successfully",
    "data": { "_id": "...", "userId": "...", "token": "..." }
  }
  ```

---

#### `POST /auth/remove-device`
Gỡ device token khi đăng xuất hoặc tắt thông báo.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "token": "fcm-device-token-xxxxx" }
  ```
- **Response (200)**:
  ```json
  { "success": true, "message": "Device removed successfully" }
  ```

---

### 1.2 Kết nối Instagram (Instagram Auth)

#### `POST /instagram-auth/start`
Bắt đầu OAuth2 flow, trả về URL mở popup đăng nhập Instagram.
- **Auth**: Bearer Token
- **Request Body**: Không cần
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": { "authorizeUrl": "https://api.instagram.com/oauth/authorize?...", "state": "csrf-state-xxx" }
  }
  ```

---

#### `POST /instagram-auth/exchange-token`
Đổi short-lived token lấy long-lived token, lưu thông tin shop.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "shortLivedToken": "IGQVJ..." }
  ```
- **Response (200)**:
  ```json
  {
    "success": true,
    "message": "Token exchanged and saved successfully",
    "data": { "instagramUserId": "17841...", "username": "shop_vn", "name": "Shop VN" }
  }
  ```

---

#### `GET /instagram-auth/status`
Kiểm tra trạng thái kết nối Instagram của user hiện tại.
- **Auth**: Bearer Token
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": { "isConnected": true, "username": "shop_vn", "shops": [...] }
  }
  ```

---

#### `POST /instagram-auth/revoke`
Hủy kết nối Instagram, xóa token.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "instagramUserId": "17841..." }
  ```
- **Response (200)**:
  ```json
  { "success": true, "message": "Token revoked and shop disconnected" }
  ```

---

#### `POST /instagram-auth/register-webhook`
Đăng ký webhook Instagram cho shop cụ thể.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "instagramUserId": "17841..." }
  ```
- **Response (200)**:
  ```json
  { "success": true, "message": "Webhook registered successfully", "data": {...} }
  ```

---

#### `POST /instagram-auth/subscribe-all-webhooks`
Tự động đăng ký webhook cho tất cả shop đang hoạt động (chạy background).
- **Auth**: Bearer Token
- **Request Body**: Không cần
- **Response (200)**:
  ```json
  { "success": true, "message": "Webhook subscription job started in background" }
  ```

---

## 📺 NHÓM 2: LIVESTREAM & REAL-TIME (CORE STREAMS)

### 2.1 Quản lý Livestream (Lives)

#### `POST /lives`
Tạo/bắt đầu một phiên live mới.
- **Auth**: Bearer Token (Role: Admin, User, Staff)
- **Request Body**:
  ```json
  {
    "igLiveId": "18023456789",
    "shopId": "shop_123",
    "userId": "65f2...",
    "totalComment": 0,
    "totalOrder": 0
  }
  ```
- **Response (201)**:
  ```json
  { "success": true, "message": "Tạo live stream thành công", "data": { "_id": "65f3...", "igLiveId": "18023456789", ... } }
  ```

---

#### `GET /lives`
Lấy danh sách tất cả live (Admin).
- **Auth**: Bearer Token (Role: Admin, User, Staff)
- **Query Params**: `?page=1&limit=10&status=...`
- **Response (200)**:
  ```json
  { "success": true, "data": { "items": [...], "pagination": { "page": 1, "limit": 10, "total": 50 } } }
  ```

---

#### `GET /lives/my-lives` hoặc `GET /lives/user/my-lives`
Danh sách live của tôi (2 route alias).
- **Auth**: Bearer Token
- **Query Params**: `?page=1&limit=10`
- **Response (200)**:
  ```json
  { "success": true, "data": { "items": [...], "pagination": { "page": 1, "limit": 10, "total": 5 } } }
  ```

---

#### `GET /lives/detect/:shopId`
Tự động nhận diện live stream đang phát trên Instagram.
- **Auth**: Bearer Token
- **Params**: `shopId` - ID Instagram shop
- **Response (200)**:
  ```json
  { "success": true, "data": { "isLive": true, "igLiveId": "180...", "liveId": "65f3..." } }
  ```

---

#### `GET /lives/liveId/:liveId`
Tìm live theo igLiveId (Instagram Live ID).
- **Auth**: Bearer Token
- **Params**: `liveId` - igLiveId
- **Response (200)**:
  ```json
  { "success": true, "data": { "_id": "65f3...", "igLiveId": "...", "title": "...", ... } }
  ```

---

#### `GET /lives/userId/:userId`
Lấy tất cả live của một user cụ thể (Admin/Staff).
- **Auth**: Bearer Token (Role: Admin, Staff)
- **Params**: `userId` - MongoDB ObjectId (24 hex)
- **Query Params**: `?page=1&limit=10`
- **Response (200)**: Giống `GET /lives/user/my-lives`

---

#### `GET /lives/:id`
Chi tiết một live stream theo MongoDB ID.
- **Auth**: Bearer Token
- **Params**: `id` - MongoDB ObjectId (24 hex)
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "65f3...", "igLiveId": "180...", "title": "Sale 05/04",
      "isLive": true, "totalComment": 120, "totalOrder": 35,
      "createdAt": "2026-04-05T...", "updatedAt": "2026-04-05T..."
    }
  }
  ```

---

#### `GET /lives/:id/comments/reload`
Tải lại bình luận từ Instagram cho live stream.
- **Auth**: Bearer Token
- **Params**: `id` - MongoDB ObjectId
- **Response (200)**:
  ```json
  { "success": true, "message": "Đã tải lại bình luận", "data": { "reloadedCount": 50 } }
  ```

---

#### `PATCH /lives/:id`
Cập nhật thông tin live stream (Admin).
- **Auth**: Bearer Token (Role: Admin)
- **Request Body**: `{ "title": "...", "isLive": false }`
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `DELETE /lives/:id`
Xóa live stream (Admin).
- **Auth**: Bearer Token (Role: Admin)
- **Response (200)**: `{ "success": true, "message": "Xóa thành công" }`

---

### 2.2 Luồng Dữ liệu Thời gian thực (SSE)

#### `GET /comments/live/:liveId/stream` (SSE)
Kết nối Server-Sent Events để nhận bình luận realtime.
- **Auth**: Bearer Token
- **Params**: `liveId` - MongoDB ObjectId
- **Giới hạn**: Tối đa 100 connections/live, tự động ngắt sau 30 phút.
- **Các Event nhận được**:

| Event Type | Mô tả | Payload |
|---|---|---|
| `connected` | Xác nhận kết nối thành công | `{ type: "connected", timestamp, liveId, connectionId }` |
| `ping` | Heartbeat mỗi 30s | `{ type: "ping", timestamp }` |
| `new_comment` | Bình luận mới | `{ type: "new_comment", timestamp, comment: { commentId, text, customerTag, price, quantity, igUsername, igUserId } }` |
| `live_stats_updated` | Cập nhật tổng số đơn/bình luận | `{ type: "live_stats_updated", timestamp, data: { totalOrders, totalComments } }` |
| `customer_closed_count_updated` | Số đơn đã chốt của khách | `{ type: "customer_closed_count_updated", timestamp, data: { customerId, closedCount } }` |

---

#### `GET /comments/stream/:liveId` (SSE)
Alias route cho backward compatibility. Hoạt động giống endpoint trên.

---

#### `POST /comments/live/:liveId/stream/disconnect`
Ngắt tất cả SSE connections của một live.
- **Auth**: Bearer Token
- **Response (200)**:
  ```json
  { "success": true, "message": "Đã disconnect 3 SSE connection(s) cho live stream", "data": { "liveId": "...", "disconnectedCount": 3 } }
  ```

---

#### `POST /comments/live/:liveId/stream/disconnect/:connectionId`
Ngắt một SSE connection cụ thể.
- **Auth**: Bearer Token
- **Response (200)**:
  ```json
  { "success": true, "message": "Đã disconnect SSE connection", "data": { "liveId": "...", "connectionId": "..." } }
  ```

---

### 2.3 Quản lý Bình luận (Comments)

#### `GET /comments/live/:liveId/cursor`
Phân trang bình luận theo cursor (dùng cho infinite scroll).
- **Auth**: Bearer Token
- **Query Params**: `?cursor=<last_comment_id>&limit=50&direction=before|after`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        { "_id": "...", "text": "mua 2 cái", "igUsername": "buyer1", "price": 100000, "quantity": 2, "customerTag": "VIP", "createdAt": "..." }
      ],
      "pagination": { "nextCursor": "65f4...", "hasMore": true }
    }
  }
  ```

---

#### `GET /comments/live/:liveId`
Alias route cho `cursor` endpoint (backward compatibility).

---

#### `GET /comments`
Lấy tất cả bình luận (Admin).
- **Auth**: Bearer Token
- **Query Params**: `?page=1&limit=10`
- **Response (200)**: `{ "success": true, "data": { "items": [...], "pagination": {...} } }`

---

#### `GET /comments/user/my-comments`
Lấy bình luận trong các live của user hiện tại.
- **Auth**: Bearer Token
- **Query Params**: `?page=1&limit=10`
- **Response (200)**: Giống `GET /comments`

---

#### `GET /comments/:commentId`
Chi tiết một bình luận.
- **Auth**: Bearer Token
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "65f4...", "text": "mua 2 cái áo", "igUsername": "buyer1", "igUserId": "1234",
      "price": 100000, "quantity": 2, "status": "NORMAL", "liveId": "65f3...", "customerId": "65f5..."
    }
  }
  ```

---

#### `PATCH /comments/:commentId`
Cập nhật bình luận (text, quantity, price). Đơn hàng liên quan tự động tính lại tổng tiền.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "text": "mua 3 cái", "quantity": 3, "price": 150000, "liveId": "...", "customerId": "..." }
  ```
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `PATCH /comments/:commentId/customer-tag`
Cập nhật nhãn khách hàng cho bình luận.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "customerTag": "VIP" }
  ```
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `DELETE /comments/:commentId`
Xóa bình luận.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "message": "Xóa bình luận thành công" }`

---

#### `POST /comments/test`
Tạo bình luận test (dùng khi dev, không cần Instagram webhook).
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "liveId": "65f3...", "text": "mua 1 cái áo", "igUsername": "test_user", "igUserId": "9999" }
  ```
- **Response (201)**: `{ "success": true, "data": {...} }`

---

#### `POST /comments/manual`
Tạo bình luận thủ công (standalone, chưa gắn vào đơn).
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "text": "mua 2 cái", "igUserId": "1234", "igUsername": "buyer1", "quantity": 2, "price": 100000 }
  ```
- **Response (201)**: `{ "success": true, "data": {...} }`

---

#### `GET /comments/:liveId/finalized-list`
Danh sách bình luận đã chốt (status: NORMAL) dùng cho tính năng backup.
- **Auth**: Bearer Token
- **Query Params**: `?backupCommentId=65f4...` (optional)
- **Response (200)**: `{ "success": true, "data": [...] }`

---

#### `POST /comments/:commentId/backup/link`
Liên kết bình luận làm backup cho bình luận chốt gần nhất.
- **Auth**: Bearer Token
- **Response (201)**: `{ "success": true, "data": {...} }`

---

#### `DELETE /comments/:commentId/backup`
Hủy liên kết backup của bình luận.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": {...} }`

---

## 📦 NHÓM 3: ĐƠN HÀNG & HÓA ĐƠN (COMMERCE)

### 3.1 Quản lý Đơn hàng (Orders)

#### `POST /orders`
Tạo đơn mới (chốt đơn từ bình luận live).
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "igId": "1234",
    "igName": "buyer1",
    "liveId": "65f3...",
    "commentId": "65f4...",
    "deposit": 50000,
    "isNewCustomer": false,
    "actionType": "NORMAL"
  }
  ```
  > `actionType`: `"NORMAL"` | `"BACKUP"` | `"CONFIRMED_ERROR"`
- **Response (201)**:
  ```json
  { "success": true, "message": "Tạo đơn hàng thành công" }
  ```

---

#### `POST /orders/manual`
Tạo đơn thủ công (gộp nhiều comment cho 1 khách).
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "customerId": "65f5...",
    "liveId": "65f3...",
    "commentIds": ["65f4a...", "65f4b..."],
    "userId": "65f2...",
    "deposit": 0,
    "actionType": "NORMAL"
  }
  ```
- **Response (201)**: `{ "success": true, "data": { "orderCode": "240405-A1B2", ... } }`

---

#### `GET /orders`
Danh sách tất cả đơn hàng (Admin).
- **Auth**: Bearer Token
- **Query Params**: `?page=1&limit=10&status=...&liveId=...`
- **Response (200)**: `{ "success": true, "data": { "items": [...], "pagination": {...} } }`

---

#### `GET /orders/user/my-orders`
Danh sách đơn hàng của tôi.
- **Auth**: Bearer Token
- **Query Params**: `?page=1&limit=10&status=...&liveId=...`
- **Response (200)**: `{ "success": true, "data": { "items": [...], "pagination": {...} } }`

---

#### `GET /orders/export/excel`
Xuất danh sách đơn hàng ra file Excel.
- **Auth**: Bearer Token
- **Query Params**: `?startDate=2026-04-01&endDate=2026-04-05&shopId=shop_123`
- **Response**: File `.xlsx` (Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

---

#### `GET /orders/:id`
Chi tiết đơn hàng theo MongoDB ID.
- **Auth**: Bearer Token
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "...", "orderCode": "240405-A1B2", "customerId": "...",
      "comments": [...], "totalPrice": 200000, "deposit": 50000,
      "status": "PENDING", "actionType": "NORMAL", "createdAt": "..."
    }
  }
  ```

---

#### `PATCH /orders/:id`
Cập nhật đơn hàng.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "customerId": "...", "liveId": "...", "commentIds": [...],
    "deposit": 100000, "quantity": 5, "totalPrice": 500000,
    "status": "COMPLETED", "actionType": "NORMAL", "isNewCustomer": false
  }
  ```
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `PATCH /orders/:id/status`
Cập nhật trạng thái đơn hàng.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "status": "COMPLETED" }
  ```
  > Các status: `PENDING`, `COMPLETED`, `CANCELLED`, `DELIVERED`, ...
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `DELETE /orders/:id`
Xóa đơn hàng.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "message": "Xóa đơn hàng thành công" }`

---

#### `POST /orders/:id/comments`
Thêm bình luận có sẵn vào đơn hàng.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "commentId": "65f4..." }
  ```
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `POST /orders/:id/manual-comment`
Tạo bình luận thủ công và thêm vào đơn hàng.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "orderId": "65f6...",
    "text": "áo size L",
    "igUserId": "1234",
    "igUsername": "buyer1",
    "quantity": 2,
    "price": 150000
  }
  ```
- **Response (201)**: `{ "success": true, "data": {...} }`

---

#### `DELETE /orders/:id/comments/:commentId`
Gỡ bình luận khỏi đơn hàng.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `POST /orders/:id/send-bill`
Gửi hóa đơn (ảnh bill) cho khách qua Instagram DM.
- **Auth**: Bearer Token
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `image`: File ảnh bill (required)
  - `igUserId`: Instagram User ID của khách (required)
- **Response (200)**: `{ "success": true, "message": "Gửi bill thành công" }`

---

### 3.2 Xem Hóa đơn Công khai (Public Bills)

#### `GET /public/orders/:orderCode`
Trang xem hóa đơn cho khách hàng (không cần login).
- **Auth**: Không cần
- **Params**: `orderCode` - Mã đơn hàng (vd: `240405-A1B2`)
- **Query Params**: `?token=<access_token>`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "orderCode": "240405-A1B2", "shopName": "Shop VN",
      "items": [{ "text": "áo size L", "quantity": 2, "price": 150000 }],
      "totalPrice": 300000, "deposit": 50000, "remaining": 250000,
      "status": "PENDING", "paymentQr": "..."
    }
  }
  ```

---

## 🚚 NHÓM 4: VẬN CHUYỂN & ĐỊA GIỚI (LOGISTICS)

### 4.1 Quản lý Vận chuyển (Delivery)

#### `GET /delivery/providers`
Danh sách nhà vận chuyển đã cấu hình.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": [...] }`

---

#### `GET /delivery/providers/:provider/config`
Lấy cấu hình nhà vận chuyển.
- **Auth**: Bearer Token
- **Params**: `provider` - `jt-express`
- **Response (200)**: `{ "success": true, "data": { "apiAccount": "...", "shopCode": "...", ... } }`

---

#### `PUT /delivery/providers/:provider/config`
Tạo/cập nhật cấu hình nhà vận chuyển.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "apiAccount": "...", "privateKey": "...", "shopCode": "...", "customerCode": "..." }
  ```
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `GET /delivery/orders`
Danh sách vận đơn.
- **Auth**: Bearer Token
- **Query Params**: `?page=1&limit=10&status=...`
- **Response (200)**: `{ "success": true, "data": { "items": [...], "pagination": {...} } }`

---

#### `GET /delivery/orders/:id`
Chi tiết vận đơn.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `POST /delivery/orders`
Lưu vận đơn vào hệ thống.
- **Auth**: Bearer Token
- **Request Body**: `{ ... }` (CreateDeliveryOrderDto)
- **Response (201)**: `{ "success": true, "data": {...} }`

---

#### `DELETE /delivery/orders/:id`
Xóa vận đơn.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "message": "Xóa thành công" }`

---

#### `POST /delivery/providers/jt-express/create-order`
Tạo vận đơn J&T Express.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "bizContent": { "senderName": "...", "receiverName": "...", ... }, "providerConfigId": "65f7..." }
  ```
- **Response (200)**: `{ "success": true, "data": { "billCode": "JT...", ... } }`

---

#### `POST /delivery/providers/jt-express/cancel-order`
Hủy vận đơn J&T Express.
- **Auth**: Bearer Token
- **Request Body**: `{ "bizContent": { "billCode": "JT..." }, "providerConfigId": "..." }`
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `POST /delivery/providers/jt-express/calculate-fees`
Tính phí vận chuyển.
- **Auth**: Bearer Token
- **Request Body**: `{ "bizContent": { "senderProvince": "...", "receiverProvince": "...", "weight": 500 }, "providerConfigId": "..." }`
- **Response (200)**: `{ "success": true, "data": { "fee": 25000, ... } }`

---

#### `POST /delivery/providers/jt-express/print-order`
In vận đơn (1 đơn).
- **Auth**: Bearer Token
- **Request Body**: `{ "bizContent": { "billCode": "JT..." }, "providerConfigId": "..." }`
- **Response (200)**: `{ "success": true, "data": { "printUrl": "..." } }`

---

#### `POST /delivery/providers/jt-express/print-orders`
In nhiều vận đơn cùng lúc.
- **Auth**: Bearer Token
- **Request Body**: `{ "bizContent": { "billCodes": ["JT1...", "JT2..."] }, "providerConfigId": "..." }`
- **Response (200)**: `{ "success": true, "data": { "printUrl": "..." } }`

---

#### `POST /delivery/providers/jt-express/query-tracking`
Tra cứu hành trình giao hàng.
- **Auth**: Bearer Token
- **Request Body**: `{ "bizContent": { "billCode": "JT..." }, "providerConfigId": "..." }`
- **Response (200)**: `{ "success": true, "data": { "details": [...] } }`

---

#### Mock Endpoints (Dev/Test)
Các endpoint mock dùng để test, không gọi J&T API thật:
- `POST /delivery/providers/jt-express/mock/create-order`
- `POST /delivery/providers/jt-express/mock/cancel-order`
- `POST /delivery/providers/jt-express/mock/calculate-fees`
- `POST /delivery/providers/jt-express/mock/print-order`
- `POST /delivery/providers/jt-express/mock/print-orders`
- `POST /delivery/providers/jt-express/mock/query-tracking`

> Request/Response format giống các endpoint thật ở trên, nhưng trả về dữ liệu giả.

---

#### `POST /delivery/webhooks/jt-express/logistics`
Webhook nhận cập nhật hành trình từ J&T Express.
- **Auth**: Không cần (xác thực qua Header digest)
- **Headers**: `apiaccount`, `digest`, `timestamp`
- **Request Body**: Payload từ J&T Express
- **Response (200)**: `{ "success": true }`

---

### 4.2 Danh mục Địa giới (Provinces)

#### `GET /provinces`
Danh sách tất cả Tỉnh/Thành phố.
- **Auth**: Không cần
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      { "code": "01", "name": "Thành phố Hà Nội", "codename": "thanh_pho_ha_noi" },
      { "code": "79", "name": "Thành phố Hồ Chí Minh", ... }
    ]
  }
  ```

---

#### `GET /provinces/:provinceCode/wards`
Danh sách Phường/Xã theo mã Tỉnh.
- **Auth**: Không cần
- **Params**: `provinceCode` - Mã tỉnh (vd: `79`)
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": [
      { "code": "26734", "name": "Phường Bến Nghé", "districtName": "Quận 1" }
    ]
  }
  ```

---

## 👥 NHÓM 5: KHÁCH HÀNG & CRM (RELATIONSHIP)

### 5.1 Quản lý Khách hàng (Customers)

#### `POST /customers/manual`
Tạo khách hàng thủ công.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "igName": "buyer1",
    "igId": "1234",
    "phone": "0901234567",
    "dayOfBirth": "1990-01-15",
    "province": "79",
    "ward": "26734",
    "street": "123 Nguyễn Huệ",
    "note": "Khách VIP",
    "userId": "65f2..."
  }
  ```
- **Response (200)**: `{ "success": true, "message": "Customer created successfully", "data": {...} }`

---

#### `GET /customers/user/my-customers`
Danh sách khách hàng của tôi.
- **Auth**: Bearer Token
- **Query Params**: `?page=1&limit=10&search=buyer`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [{ "_id": "...", "igName": "buyer1", "phone": "...", "tag": {...}, "orderCount": 5 }],
      "pagination": { "page": 1, "limit": 10, "total": 50 }
    }
  }
  ```

---

#### `GET /customers/userId/:userId`
Danh sách khách hàng theo userId (Admin/Staff).
- **Auth**: Bearer Token (Role: Admin, Staff)
- **Query Params**: `?page=1&limit=10&search=...`
- **Response (200)**: Giống `GET /customers/user/my-customers`

---

#### `GET /customers/:customerId`
Chi tiết khách hàng (có thể kèm lịch sử mua hàng).
- **Auth**: Bearer Token
- **Query Params**: `?includeHistories=true`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "65f5...", "igName": "buyer1", "igId": "1234",
      "phone": "0901234567", "province": "79", "ward": "26734", "street": "...",
      "tag": { "_id": "...", "label": "VIP", "color": "#FF0000" },
      "histories": [{ "commentId": "...", "text": "mua 2 cái", "liveId": "..." }]
    }
  }
  ```

---

#### `PATCH /customers/:customerId/profile`
Cập nhật thông tin khách hàng.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "igName": "new_name", "phone": "0909999999", "dayOfBirth": "1990-05-20",
    "province": "01", "ward": "00001", "street": "456 Lê Lợi", "note": "..."
  }
  ```
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `POST /customers/:customerId/tags/:tagId`
Gán nhãn cho khách hàng.
- **Auth**: Bearer Token (Role: Admin, Staff)
- **Response (200)**: `{ "success": true, "message": "Tag assigned to customer successfully", "data": {...} }`

---

#### `DELETE /customers/:customerId/tags`
Gỡ nhãn khỏi khách hàng.
- **Auth**: Bearer Token (Role: Admin, Staff)
- **Response (200)**: `{ "success": true, "message": "Tag removed from customer successfully", "data": {...} }`

---

#### `GET /customers/tags/:tagId`
Lấy tất cả khách hàng có nhãn cụ thể.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": [...] }`

---

#### `DELETE /customers/:customerId`
Xóa khách hàng và toàn bộ đơn hàng liên quan.
- **Auth**: Bearer Token (Role: Admin, Staff)
- **Response (200)**: `{ "success": true, "message": "Customer and all associated orders deleted successfully" }`

---

### 5.2 Nhãn màu (Tags)

#### `POST /tags`
Tạo nhãn mới.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "label": "VIP", "color": "#FF0000" }
  ```
- **Response (200)**: `{ "success": true, "message": "Tag created successfully", "data": { "_id": "...", "label": "VIP", "color": "#FF0000" } }`

---

#### `GET /tags`
Danh sách tất cả nhãn (Admin).
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": [...] }`

---

#### `GET /tags/user/my-tags`
Danh sách nhãn của tôi.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": [{ "_id": "...", "label": "VIP", "color": "#FF0000" }] }`

---

#### `GET /tags/:id`
Chi tiết nhãn.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": { "_id": "...", "label": "VIP", "color": "#FF0000" } }`

---

#### `PATCH /tags/:id`
Cập nhật nhãn.
- **Auth**: Bearer Token
- **Request Body**: `{ "label": "Super VIP", "color": "#00FF00" }`
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `DELETE /tags/:id`
Xóa nhãn.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "message": "Tag deleted successfully" }`

---

## 👤 NHÓM 6: NGƯỜI DÙNG & CÀI ĐẶT (USER MANAGEMENT)

### 6.1 Quản lý Profile

#### `GET /users/me`
Lấy thông tin profile hiện tại.
- **Auth**: Bearer Token
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "65f2...", "email": "user@example.com", "fullName": "Nguyen Van A",
      "role": ["User"], "shops": [...], "createdAt": "..."
    }
  }
  ```

---

#### `PATCH /users/me`
Cập nhật profile.
- **Auth**: Bearer Token
- **Request Body**: `{ "fullName": "Tên mới", "phone": "...", ... }`
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `GET /users/:id`
Chi tiết user (owner hoặc Admin).
- **Auth**: Bearer Token
- **Response (200)**: Giống `GET /users/me`

---

#### `PATCH /users/:id`
Cập nhật user (owner hoặc Admin).
- **Auth**: Bearer Token
- **Request Body**: Giống `PATCH /users/me`
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `DELETE /users/:id`
Xóa user (Admin only).
- **Auth**: Bearer Token (Role: Admin)
- **Response (200)**: `{ "success": true, "message": "Xóa thành công" }`

---

### 6.2 Quản lý Shop

#### `GET /users/me/shops`
Danh sách shop của tôi.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": [{ "id": "shop_123", "igName": "...", "avatar": "..." }] }`

---

#### `POST /users/me/shops`
Thêm shop mới.
- **Auth**: Bearer Token
- **Request Body**: `{ "shop": { "igName": "shop_moi", ... } }`
- **Response (201)**: `{ "success": true, "data": {...} }`

---

#### `PATCH /users/me/shops/:shopId`
Cập nhật thông tin shop.
- **Auth**: Bearer Token
- **Request Body**: `{ "shop": { "igName": "...", ... } }`
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `DELETE /users/me/shops/:shopId`
Xóa shop.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "message": "Xóa shop thành công" }`

---

#### `POST /users/me/shops/:shopId/avatar`
Upload avatar cho shop.
- **Auth**: Bearer Token
- **Content-Type**: `multipart/form-data`
- **Body**: `file` - File ảnh
- **Response (200)**:
  ```json
  { "success": true, "message": "Upload shop avatar thành công", "data": { "avatar": "https://...", "shops": [...] } }
  ```

---

#### `POST /users/me/shops/:shopId/bank-settings`
Lưu thiết lập ngân hàng cho shop (dùng tạo QR thanh toán).
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "bin": "970422", "accountNo": "0123456789", "accountName": "NGUYEN VAN A" }
  ```
- **Response (200)**: `{ "success": true, "message": "Lưu thiết lập ngân hàng thành công", "data": {...} }`

---

#### `GET /users/banks`
Lấy danh sách ngân hàng hỗ trợ (từ VietQR, có cache).
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": [{ "bin": "970422", "name": "MB Bank", "shortName": "MBBank", "logo": "..." }] }`

---

### 6.3 Template Tin nhắn & In Bill

#### `GET /users/me/print-template`
Lấy template in bill hiện tại.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": { "header": "...", "footer": "...", ... } }`

---

#### `PATCH /users/me/print-template`
Cập nhật template in bill.
- **Auth**: Bearer Token
- **Request Body**: `{ "header": "...", "footer": "...", ... }`
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `PATCH /users/me/message-template`
Cập nhật template tin nhắn (gửi khi chốt đơn, backup, error, khách mới).
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "messageTemplate": {
      "order": "Cảm ơn bạn đã mua hàng! Đơn {orderCode}...",
      "comment": "...",
      "backup": "...",
      "error": "...",
      "newCustomer": "Chào mừng bạn mới..."
    }
  }
  ```
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `POST /users/me/message-template/images`
Upload ảnh cho template tin nhắn.
- **Auth**: Bearer Token
- **Content-Type**: `multipart/form-data`
- **Query Params**: `?templateType=order1|order2|comment|backup|error`
- **Body**: `file` - File ảnh, `oldImageUrl` (optional) - URL ảnh cũ cần xóa
- **Response (200)**:
  ```json
  { "success": true, "message": "Upload ảnh template thành công", "data": { "url": "https://..." } }
  ```

---

## 🔔 NHÓM 7: THÔNG BÁO (NOTIFICATIONS)

### 7.1 Push Notifications

#### `POST /push/expo-token`
Đăng ký Expo Push Token (cho mobile app).
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  { "token": "ExponentPushToken[xxxxxx]" }
  ```
- **Response (200)**: `{ "success": true, "message": "Expo push token registered successfully", "data": {...} }`

---

### 7.2 Quản lý Thông báo (Notifications)

#### `GET /notifications`
Danh sách thông báo của tôi.
- **Auth**: Bearer Token
- **Query Params**: `?page=1&limit=10&isRead=false&type=ORDER`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        { "_id": "...", "type": "ORDER", "title": "Đơn hàng mới", "body": "...", "isRead": false, "createdAt": "..." }
      ],
      "pagination": { "page": 1, "limit": 10, "total": 25 }
    }
  }
  ```

---

#### `GET /notifications/user/:userId`
Danh sách thông báo theo userId (Admin only).
- **Auth**: Bearer Token (Role: Admin)
- **Query Params**: `?page=1&limit=10&isRead=...&type=...`
- **Response (200)**: Giống `GET /notifications`

---

#### `PATCH /notifications/:id/read`
Đánh dấu đã đọc một thông báo.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "message": "Notification marked as read", "data": {...} }`

---

#### `PATCH /notifications/read-all`
Đánh dấu đã đọc tất cả thông báo.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "message": "All notifications marked as read", "data": { "modifiedCount": 15 } }`

---

#### `DELETE /notifications/:id`
Xóa một thông báo.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "message": "Notification deleted successfully" }`

---

#### `DELETE /notifications`
Xóa tất cả thông báo.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "message": "All notifications deleted successfully", "data": { "deletedCount": 25 } }`

---

## 📊 NHÓM 8: THỐNG KÊ & METRICS (ANALYTICS)

### 8.1 Dashboard Metrics

#### `GET /users/me/metrics/dashboard`
Dashboard tổng quan cá nhân.
- **Auth**: Bearer Token
- **Query Params**: `?period=day|week|month|year&comparison=previous_period|previous_week|previous_month|previous_year|none&startDate=...&endDate=...&liveId=...`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "orders": { "total": 150, "change": 12.5, "changeLabel": "+12.5%" },
      "revenue": { "total": 15000000, "change": -5.2 },
      "customers": { "total": 80, "newCount": 15 },
      "comments": { "total": 500 },
      "lives": { "total": 10 }
    }
  }
  ```

---

#### `GET /users/metrics/dashboard`
Dashboard tổng quan (Admin xem toàn bộ, User xem của mình).
- **Auth**: Bearer Token
- **Query Params**: Giống `GET /users/me/metrics/dashboard`
- **Response (200)**: Giống trên

---

### 8.2 Metrics Chi tiết

| Endpoint | Mô tả |
|---|---|
| `GET /users/me/metrics/orders` | Metrics đơn hàng cá nhân |
| `GET /users/me/metrics/comments` | Metrics bình luận cá nhân |
| `GET /users/me/metrics/lives` | Metrics livestream cá nhân |
| `GET /users/me/metrics/customers` | Metrics khách hàng cá nhân |
| `GET /users/me/metrics/revenue` | Metrics doanh thu cá nhân |
| `GET /users/metrics/orders` | Metrics đơn hàng (Admin: toàn bộ) |
| `GET /users/metrics/comments` | Metrics bình luận (Admin: toàn bộ) |
| `GET /users/metrics/lives` | Metrics livestream (Admin: toàn bộ) |
| `GET /users/metrics/customers` | Metrics khách hàng (Admin: toàn bộ) |
| `GET /users/metrics/revenue` | Metrics doanh thu (Admin: toàn bộ) |
| `GET /users/metrics/users` | Metrics users (Admin only) |
| `GET /users/metrics/subscriptions` | Metrics gói subscription (Admin only) |

> Tất cả đều nhận **Query Params**: `?period=month&comparison=previous_period&userId=...&liveId=...&startDate=...&endDate=...`

---

### 8.3 Time Series (Biểu đồ)

| Endpoint | Mô tả |
|---|---|
| `GET /users/me/metrics/orders/time-series` | Dữ liệu đơn hàng theo thời gian (cá nhân) |
| `GET /users/me/metrics/comments/time-series` | Dữ liệu bình luận theo thời gian (cá nhân) |
| `GET /users/metrics/orders/time-series` | Dữ liệu đơn hàng theo thời gian (Admin: toàn bộ) |
| `GET /users/metrics/comments/time-series` | Dữ liệu bình luận theo thời gian (Admin: toàn bộ) |

- **Query Params**: `?startDate=2026-04-01&endDate=2026-04-05&groupBy=day|week|month&userId=...&liveId=...`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "series": [
        { "date": "2026-04-01", "count": 25, "revenue": 5000000 },
        { "date": "2026-04-02", "count": 30, "revenue": 6500000 }
      ]
    }
  }
  ```

---

### 8.4 Thống kê Doanh thu

#### `GET /statistics/revenue`
Biểu đồ doanh thu theo kỳ.
- **Auth**: Bearer Token
- **Query Params**: `?period=day|week|month|year&startDate=...&endDate=...&liveId=...&userId=...`
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "totalRevenue": 50000000,
      "series": [{ "label": "Tháng 1", "value": 12000000 }, { "label": "Tháng 2", "value": 15000000 }]
    }
  }
  ```

---

## 💎 NHÓM 9: GÓI ĐĂNG KÝ (SUBSCRIPTIONS)

### 9.1 Gói dịch vụ (Plans)

#### `GET /subscriptions/plans`
Danh sách các gói đăng ký hiện có.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": [{ "_id": "...", "name": "Pro", "type": "PRO", "price": 299000, "orderLimit": 1000, ... }] }`

---

#### `GET /subscriptions/plans/:id`
Chi tiết gói đăng ký.
- **Auth**: Bearer Token
- **Response (200)**: `{ "success": true, "data": {...} }`

---

#### `POST /subscriptions/plans` (Admin)
Tạo gói đăng ký mới.

#### `PATCH /subscriptions/plans/:id` (Admin)
Cập nhật gói đăng ký.

#### `DELETE /subscriptions/plans/:id` (Admin)
Xóa gói đăng ký.

---

### 9.2 Subscription của User

#### `GET /subscriptions/user/my-subscription`
Gói đăng ký hiện tại của tôi.
- **Auth**: Bearer Token
- **Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "...", "userId": "...", "type": "PRO",
      "startDate": "2026-04-01", "endDate": "2026-05-01",
      "orderLimit": 1000, "ordersUsed": 120, "isActive": true
    }
  }
  ```

---

#### `GET /subscriptions/user/my-subscription/check-limit`
Kiểm tra giới hạn đơn hàng còn lại.
- **Auth**: Bearer Token
- **Response (200)**:
  ```json
  { "success": true, "message": "Kiểm tra giới hạn đơn hàng thành công", "data": { "limit": 1000, "used": 120, "remaining": 880, "isLimitReached": false } }
  ```

---

#### `GET /subscriptions/user/:userId` (Admin/Staff)
Xem subscription của user cụ thể.

#### `GET /subscriptions/user/:userId/check-limit` (Admin)
Kiểm tra giới hạn của user cụ thể.

#### `POST /subscriptions/user/:userId/renew` (Admin)
Gia hạn subscription.
- **Request Body**: `{ "type": "PRO" }`

---

## 📱 NHÓM 10: OTA & CẬP NHẬT (MAINTENANCE)

#### `GET /ota/check`
Kiểm tra phiên bản mới cho mobile app.
- **Auth**: Không cần
- **Query Params**: `?binaryVersion=1.0.0`
- **Response (200)**:
  ```json
  {
    "version": "1.0.1",
    "downloadAndroidUrl": "https://...",
    "downloadIosUrl": "https://...",
    "updateJsonUrl": "https://..."
  }
  ```

---

## 🔧 NHÓM 11: INSTAGRAM WEBHOOK (Internal)

#### `GET /instagram/webhook`
Xác minh webhook từ Instagram (verification challenge).
- **Auth**: Không cần
- **Query Params**: `?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
- **Response**: Trả về `hub.challenge` nếu hợp lệ

---

#### `POST /instagram/webhook`
Nhận live comments & postback từ Instagram. Xử lý bất đồng bộ qua BullMQ Queue.
- **Auth**: Không cần (xác thực qua Header `x-hub-signature-256`)
- **Request Body**: Instagram webhook payload
- **Response (200)**: `{ "status": "ok", "message": "Webhook queued for processing" }`

---

*Ghi chú: Tất cả Response đều trả về cấu trúc `{ success: boolean, message?: string, data: any }`. Header `Authorization: Bearer <token>` là bắt buộc cho hầu hết các API trừ các endpoint Public và Webhook.*
