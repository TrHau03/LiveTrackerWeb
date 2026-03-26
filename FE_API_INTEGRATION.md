# FE API Integration Guide

Tài liệu này tổng hợp toàn bộ API hiện có dưới `src/modules` để FE/mobile tích hợp.

## 1. Convention chung

### Base URL

- API prefix mặc định: `/api/v1`
- Local mặc định theo `src/main.ts`: `http://localhost:3000/api/v1`
- Ngoại lệ không dùng prefix:
  - `/web/admin/*`
  - `/`

### Auth

- JWT endpoint private dùng header:

```http
Authorization: Bearer <accessToken>
```

- `accessToken` hết hạn sau `15m`
- `refreshToken` hết hạn sau `7d`
- Role enum hiện tại:
  - `admin`
  - `user`
  - `staff`

### Validation / Error format

- Global `ValidationPipe` đang bật:
  - `transform: true`
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
- FE chỉ nên gửi đúng field được khai báo trong DTO, gửi field thừa sẽ bị reject.
- Error chung:

```json
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "timestamp": "2026-03-26T00:00:00.000Z"
}
```

### Success format

Phần lớn endpoint trả về:

```json
{
  "success": true,
  "message": "Success message",
  "data": {}
}
```

Một số endpoint trả file stream, SSE hoặc trả object trực tiếp.

### Content types đặc biệt

- JSON: `application/json`
- Upload ảnh/file:
  - `multipart/form-data`
- SSE:
  - `text/event-stream`

### Lưu ý về quyền

- Cột `Role` bên dưới được ghi theo decorator/controller hiện tại.
- Riêng `customers` và `tags` controller chỉ gắn `JwtAuthGuard`, chưa gắn `RolesGuard`, nên role check server-side có thể không bị cưỡng chế đầy đủ dù code có `@Roles(...)`.

## 2. Auth

### DTO

`RegisterEmailDto`

```json
{
  "email": "string(email)",
  "password": "string >= 6",
  "confirmPassword": "string >= 6",
  "username": "string?",
  "role": ["admin|user|staff"],
  "fullName": "string?"
}
```

`LoginEmailDto`

```json
{
  "email": "string(email)",
  "password": "string >= 6"
}
```

`RefreshTokenDto`

```json
{
  "refreshToken": "string"
}
```

`RegisterDeviceDto` / `RemoveDeviceDto`

```json
{
  "token": "string"
}
```

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/auth/register` | No | Public | `body: RegisterEmailDto` | Tạo tài khoản, auto tạo free subscription |
| `POST` | `/auth/register-admin` | Bearer | `admin` | `body: RegisterEmailDto` | Tạo account role admin bởi admin hiện tại |
| `POST` | `/auth/login` | No | Public | `body: LoginEmailDto` | `data.tokens.accessToken`, `data.tokens.refreshToken` |
| `POST` | `/auth/refresh-token` | No | Public | `body: { refreshToken }` | `data.accessToken` |
| `POST` | `/auth/logout` | Bearer | Authenticated | `body: { refreshToken? }` | Hiện trả message logout thành công |
| `POST` | `/auth/register-device` | Bearer | Authenticated | `body: { token }` | Đăng ký device token push |
| `POST` | `/auth/remove-device` | Bearer | Authenticated | `body: { token }` | Xóa device token |

### Login response mẫu

```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "tokens": {
      "accessToken": "jwt",
      "refreshToken": "jwt"
    }
  }
}
```

## 3. Users

### DTO chính

`CreateUserDto`

```json
{
  "fullName": "string",
  "shop": {
    "id": "string?",
    "name": "string?",
    "avatar": "string?",
    "phone": "string?",
    "address": "string?"
  },
  "shops": [
    {
      "id": "string?",
      "name": "string?",
      "avatar": "string?",
      "phone": "string?",
      "address": "string?"
    }
  ]
}
```

`UpdateUserDto`

```json
{
  "fullName": "string?"
}
```

`QueryUserDto`

```json
{
  "page": "number=1?",
  "limit": "number=10?",
  "search": "string?",
  "sortBy": "string=createdAt?",
  "sortOrder": "asc|desc=desc?"
}
```

`CreateShopDto`

```json
{
  "shop": {
    "id": "string?",
    "name": "string?",
    "avatar": "string?",
    "phone": "string?",
    "address": "string?"
  }
}
```

`UpdateShopDto`

```json
{
  "shop": {
    "id": "string?",
    "name": "string?",
    "avatar": "string?",
    "phone": "string?",
    "address": "string?"
  },
  "shopId": "string?"
}
```

`UpdatePrintTemplateDto`

```json
{
  "orderTemplate": {
    "shopInfo": { "name": true, "address": true, "phone": true },
    "customerInfo": { "address": true, "phone": true },
    "productInfo": { "productList": true, "totalAmount": true }
  },
  "commentTemplate": {
    "shopInfo": { "name": true, "address": true, "phone": true },
    "productInfo": { "product": true, "quantity": true, "price": true }
  }
}
```

`UpdateMessageTemplateDto`

```json
{
  "messageTemplate": {
    "order": {
      "template": [
        { "content": "Có chứa {{variable}}", "isActive": true }
      ],
      "image": "string?"
    },
    "comment": [
      { "content": "Có chứa {{variable}}", "isActive": true }
    ],
    "backup": [
      { "content": "Có chứa {{variable}}", "isActive": true }
    ],
    "error": [
      { "content": "Có chứa {{variable}}", "isActive": true }
    ],
    "newCustomer": [
      { "content": "Có chứa {{variable}}", "isActive": true }
    ]
  }
}
```

`MetricsQueryDto`

```json
{
  "period": "day|week|month|year?",
  "comparison": "previous_period|previous_week|previous_month|previous_year|none?",
  "userId": "string?",
  "liveId": "string?",
  "startDate": "string?",
  "endDate": "string?"
}
```

`TimeSeriesQueryDto`

```json
{
  "startDate": "ISO date?",
  "endDate": "ISO date?",
  "groupBy": "day|week|month?",
  "userId": "string?",
  "liveId": "string?"
}
```

### Profile / CRUD / shops

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/users` | Bearer | `admin` | `body: CreateUserDto` | Tạo user profile |
| `GET` | `/users` | Bearer | `admin,user,staff` | `query: QueryUserDto` | Danh sách user phân trang |
| `GET` | `/users/me` | Bearer | Authenticated | none | Profile của user hiện tại |
| `GET` | `/users/me/print-template` | Bearer | Authenticated | none | Print template hiện tại |
| `GET` | `/users/:id` | Bearer | Owner hoặc `admin/user` | `param: id` | Chi tiết user |
| `PATCH` | `/users/me` | Bearer | Authenticated | `body: UpdateUserDto` | Cập nhật profile hiện tại |
| `PATCH` | `/users/me/print-template` | Bearer | Authenticated | `body: UpdatePrintTemplateDto` | Cập nhật print template |
| `PATCH` | `/users/:id` | Bearer | Owner hoặc `admin` | `body: UpdateUserDto` | Cập nhật user |
| `DELETE` | `/users/:id` | Bearer | `admin` | `param: id` | Xóa user |
| `PATCH` | `/users/me/message-template` | Bearer | Authenticated | `body: UpdateMessageTemplateDto` | Cập nhật message template |
| `POST` | `/users/me/message-template/images?templateType=order1\|order2\|comment\|backup\|error` | Bearer | Authenticated | `multipart/form-data`: `file`, `oldImageUrl?` | Upload image cho message template, file <= 5MB |
| `GET` | `/users/me/shops` | Bearer | Authenticated | none | Danh sách shop của current user |
| `POST` | `/users/me/shops` | Bearer | Authenticated | `body: CreateShopDto` | Thêm shop |
| `PATCH` | `/users/me/shops/:shopId` | Bearer | Authenticated | `body: UpdateShopDto` | Cập nhật shop |
| `DELETE` | `/users/me/shops/:shopId` | Bearer | Authenticated | `param: shopId` | Xóa shop |
| `POST` | `/users/me/shops/:shopId/avatar` | Bearer | Authenticated | `multipart/form-data`: `file` | Upload avatar shop, file <= 5MB |
| `GET` | `/users/:id/shops` | Bearer | `admin` | `param: id` | Lấy shops của user bất kỳ |
| `POST` | `/users/:id/shops` | Bearer | `admin` | `body: CreateShopDto` | Thêm shop cho user |
| `PATCH` | `/users/:id/shops/:shopId` | Bearer | `admin` | `body: UpdateShopDto` | Cập nhật shop của user |
| `DELETE` | `/users/:id/shops/:shopId` | Bearer | `admin` | `param: id, shopId` | Xóa shop của user |
| `POST` | `/users/:id/shops/:shopId/avatar` | Bearer | `admin` | `multipart/form-data`: `file` | Upload avatar shop cho user bất kỳ |

### Metrics

Tất cả endpoint dưới đây dùng `MetricsQueryDto` trừ các endpoint `time-series`.

#### Response shape chính

- Dashboard: `data.period`, `data.users`, `data.orders`, `data.comments`, `data.lives`, `data.customers`
- Orders metrics: `data.summary`, `data.chartData.current|previous`, `data.topUsers`
- Comments metrics: `data.summary.total`, `data.summary.inOrder`, `data.summary.conversionRate`, `data.chartData`, `data.topUsers`
- Lives metrics: `data.summary`, `data.chartData`, `data.topLives`
- Users metrics: `data.summary`, `data.bySubscription`, `data.chartData`
- Customers metrics: `data.summary`, `data.chartData`, `data.topCustomers`
- Subscriptions metrics: `data.distribution`, `data.active`, `data.expiringSoon`, `data.expired`
- Revenue metrics: `data.summary`, `data.chartData.current|previous`, `data.topUsers`

#### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/users/metrics/dashboard` | Bearer | Authenticated | `query: MetricsQueryDto` | Dashboard tổng quan; non-admin bị ép về user hiện tại |
| `GET` | `/users/metrics/orders` | Bearer | Authenticated | `query: MetricsQueryDto` | Metrics orders + chart |
| `GET` | `/users/metrics/comments` | Bearer | Authenticated | `query: MetricsQueryDto` | Metrics comments + conversion |
| `GET` | `/users/metrics/lives` | Bearer | Authenticated | `query: MetricsQueryDto` | Metrics lives |
| `GET` | `/users/metrics/users` | Bearer | `admin` | `query: MetricsQueryDto` | Metrics users |
| `GET` | `/users/metrics/customers` | Bearer | Authenticated | `query: MetricsQueryDto` | Metrics customers |
| `GET` | `/users/metrics/subscriptions` | Bearer | `admin` | none | Metrics subscriptions |
| `GET` | `/users/me/metrics/dashboard` | Bearer | Authenticated | `query: MetricsQueryDto` | Dashboard của current user |
| `GET` | `/users/me/metrics/orders` | Bearer | Authenticated | `query: MetricsQueryDto` | Orders metrics của current user |
| `GET` | `/users/me/metrics/comments` | Bearer | Authenticated | `query: MetricsQueryDto` | Comments metrics của current user |
| `GET` | `/users/me/metrics/lives` | Bearer | Authenticated | `query: MetricsQueryDto` | Lives metrics của current user |
| `GET` | `/users/me/metrics/customers` | Bearer | Authenticated | `query: MetricsQueryDto` | Customers metrics của current user |
| `GET` | `/users/metrics/revenue` | Bearer | Authenticated | `query: MetricsQueryDto` | Revenue metrics; non-admin bị ép về current user |
| `GET` | `/users/me/metrics/revenue` | Bearer | Authenticated | `query: MetricsQueryDto` | Revenue metrics của current user |

### Time series

Response chính:

- Orders time-series: `data.timeRange`, `data.statistics`, `data.chartData`, `data.details`
- Comments time-series: `data.timeRange`, `data.statistics`, `data.chartData`, `data.details`

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/users/metrics/orders/time-series` | Bearer | Authenticated | `query: TimeSeriesQueryDto` | Time-series orders |
| `GET` | `/users/metrics/comments/time-series` | Bearer | Authenticated | `query: TimeSeriesQueryDto` | Time-series comments |
| `GET` | `/users/me/metrics/orders/time-series` | Bearer | Authenticated | `query: TimeSeriesQueryDto` | Time-series orders current user |
| `GET` | `/users/me/metrics/comments/time-series` | Bearer | Authenticated | `query: TimeSeriesQueryDto` | Time-series comments current user |

## 4. Lives

### DTO

`CreateLiveDto`

```json
{
  "igLiveId": "string",
  "shopId": "string",
  "userId": "string",
  "totalComment": "number >= 0?",
  "totalOrder": "number >= 0?"
}
```

`UpdateLiveDto`

```json
{
  "igLiveId": "string?",
  "shopId": "string?",
  "userId": "string?",
  "totalComment": "number >= 0?",
  "totalOrder": "number >= 0?",
  "isLive": "boolean?",
  "lastWebhookAt": "Date?"
}
```

`QueryLiveDto`

```json
{
  "page": "number=1?",
  "limit": "number=10?",
  "search": "string?",
  "userId": "string?",
  "shopId": "string?",
  "startDate": "string?",
  "endDate": "string?",
  "sortBy": "string=createdAt?",
  "sortOrder": "asc|desc=desc?"
}
```

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/lives` | Bearer | `admin,user,staff` | `body: CreateLiveDto` | Tạo live |
| `GET` | `/lives` | Bearer | `admin,user,staff` | `query: QueryLiveDto` | Danh sách live phân trang |
| `GET` | `/lives/my-lives` | Bearer | `admin,user,staff` | `query: QueryLiveDto` | Live của current user |
| `GET` | `/lives/user/my-lives` | Bearer | `admin,user,staff` | `query: QueryLiveDto` | Alias của `/lives/my-lives` |
| `GET` | `/lives/metrics/stats` | Bearer | `admin` | none | Debug stats của in-memory metrics |
| `GET` | `/lives/metrics` | Bearer | `admin` | `query: endpoint?, method?, statusCode?, userId?` | Debug metrics detail |
| `GET` | `/lives/detect/:shopId` | Bearer | `admin,user,staff` | `param: shopId` | Detect live stream theo shop |
| `GET` | `/lives/liveId/:liveId` | Bearer | `admin,user,staff` | `param: liveId` | Tìm live theo `igLiveId` |
| `GET` | `/lives/userId/:userId` | Bearer | `admin,staff` | `param: userId`, `query: QueryLiveDto` | Live theo userId |
| `GET` | `/lives/:id` | Bearer | `admin,user,staff` | `param: id` | Chi tiết live; có special case `mock-live-id` |
| `GET` | `/lives/:id/comments/reload` | Bearer | `admin,user,staff` | `param: id` | Reload comments của live |
| `PATCH` | `/lives/:id` | Bearer | `admin` | `body: UpdateLiveDto` | Cập nhật live |
| `DELETE` | `/lives/:id` | Bearer | `admin` | `param: id` | Xóa live |

## 5. Comments

### DTO

`CreateManualCommentStandaloneDto`

```json
{
  "text": "string",
  "quantity": "number >= 1?",
  "price": "number >= 0?",
  "igUserId": "string",
  "igUsername": "string"
}
```

`CreateManualCommentDto`

```json
{
  "orderId": "string",
  "text": "string",
  "quantity": "number >= 1?",
  "price": "number >= 0?",
  "igUserId": "string",
  "igUsername": "string"
}
```

`CreateTestCommentDto`

```json
{
  "liveId": "string",
  "text": "string",
  "igUsername": "string?",
  "igUserId": "string?"
}
```

`GetCommentsQueryDto`

```json
{
  "page": "number=1?",
  "limit": "number=50?",
  "sort": "string=-createdAt?"
}
```

`GetCommentsCursorDto`

```json
{
  "cursor": "string?",
  "limit": "number=20?",
  "direction": "next|prev=next?"
}
```

`UpdateCommentDto`

```json
{
  "liveId": "string?",
  "customerId": "string?",
  "text": "string?",
  "quantity": "number >= 1?",
  "price": "number >= 0?"
}
```

`UpdateCustomerTagDto`

```json
{
  "customerTagId": "string?"
}
```

### SSE contract

`GET /comments/live/:liveId/stream` và `GET /comments/stream/:liveId` trả `text/event-stream`.

- Message đầu tiên:

```json
{
  "type": "connected",
  "timestamp": "ISO date",
  "liveId": "string",
  "connectionId": "string"
}
```

- Ping mỗi 30 giây:

```json
{
  "type": "ping",
  "timestamp": "ISO date"
}
```

- Event comment mới:

```json
{
  "type": "new_comment",
  "timestamp": "ISO date",
  "comment": {}
}
```

- Event khác:

```json
{
  "type": "event_name",
  "timestamp": "ISO date",
  "data": {}
}
```

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/comments/mock-sse` | No | Public | SSE | Mock SSE, trả `"hello"` mỗi giây |
| `GET` | `/comments/live/:liveId/cursor` | Bearer | Authenticated | `query: GetCommentsCursorDto` | Cursor pagination; có special case `mock-live-id` |
| `GET` | `/comments/live/:liveId` | Bearer | Authenticated | `query: GetCommentsCursorDto` | Alias backward compatibility |
| `GET` | `/comments/live/:liveId/stream` | Bearer | Authenticated | SSE | Stream realtime comment |
| `POST` | `/comments/live/:liveId/stream/disconnect` | Bearer | Authenticated | none | Disconnect toàn bộ SSE connection của live |
| `POST` | `/comments/live/:liveId/stream/disconnect/:connectionId` | Bearer | Authenticated | none | Disconnect một SSE connection |
| `GET` | `/comments/stream/:liveId` | Bearer | Authenticated | SSE | Alias của stream endpoint |
| `POST` | `/comments/test` | Bearer | Authenticated | `body: CreateTestCommentDto` | Tạo comment test |
| `POST` | `/comments/manual` | Bearer | Authenticated | `body: CreateManualCommentStandaloneDto` | Tạo manual comment standalone |
| `GET` | `/comments` | Bearer | Authenticated | `query: GetCommentsQueryDto` | Danh sách comments phân trang |
| `GET` | `/comments/user/my-comments` | Bearer | Authenticated | `query: GetCommentsQueryDto` | Comments của current user |
| `GET` | `/comments/:commentId` | Bearer | Authenticated | `param: commentId` | Chi tiết comment |
| `PATCH` | `/comments/:commentId/customer-tag` | Bearer | Authenticated | `body: UpdateCustomerTagDto` | Update tag của customer gắn với comment |
| `PATCH` | `/comments/:commentId` | Bearer | Authenticated | `body: UpdateCommentDto` | Update comment; order liên quan được recalc |
| `GET` | `/comments/:liveId/finalized-list` | Bearer | Authenticated | `query: backupCommentId?` | Danh sách comment finalized để link backup |
| `POST` | `/comments/:commentId/backup/link` | Bearer | Authenticated | none | Auto link backup comment vào finalized comment gần nhất |
| `DELETE` | `/comments/:commentId/backup` | Bearer | Authenticated | none | Unlink backup comment |
| `DELETE` | `/comments/:commentId` | Bearer | Authenticated | none | Xóa comment |
| `POST` | `/comments/sendMessage/:commentId` | Bearer | Authenticated | `body: string` | Hiện đang TODO, backend trả success mock |

## 6. Orders

### DTO

`CreateOrderDto`

```json
{
  "igId": "string",
  "igName": "string",
  "liveId": "string",
  "commentId": "string",
  "deposit": "number >= 0?",
  "isNewCustomer": "boolean?",
  "actionType": "NORMAL|BACKUP|CONFIRMED_ERROR?"
}
```

`CreateManualOrderDto`

```json
{
  "customerId": "MongoId",
  "liveId": "MongoId?",
  "commentIds": ["MongoId"],
  "userId": "MongoId?",
  "deposit": "number >= 0?",
  "actionType": "NORMAL|BACKUP|CONFIRMED_ERROR?"
}
```

`UpdateOrderDto`

```json
{
  "customerId": "string?",
  "liveId": "string?",
  "commentIds": ["string"] ,
  "deposit": "number >= 0?",
  "quantity": "number >= 1?",
  "totalPrice": "number >= 0?",
  "actionType": "NORMAL|BACKUP|CONFIRMED_ERROR?",
  "isNewCustomer": "boolean?"
}
```

`QueryOrderDto`

```json
{
  "page": "number=1?",
  "limit": "number=10?",
  "search": "string?",
  "customerName": "string?",
  "phone": "string?",
  "orderCode": "string?",
  "hasDeposit": "true|false?",
  "fromDate": "ISO8601?",
  "toDate": "ISO8601?",
  "customerId": "string?",
  "liveId": "string?",
  "sortBy": "string=createdAt?",
  "sortOrder": "asc|desc=desc?"
}
```

`ExportOrdersDto`

```json
{
  "startDate": "ISO date",
  "endDate": "ISO date",
  "shopId": "string?"
}
```

`AddCommentToOrderDto`

```json
{
  "commentId": "string"
}
```

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/orders` | Bearer | `admin,user,staff` | `body: CreateOrderDto` | Tạo order từ comment |
| `POST` | `/orders/manual` | Bearer | `admin,user,staff` | `body: CreateManualOrderDto` | Tạo order thủ công |
| `GET` | `/orders/export/excel` | Bearer | `admin,user,staff` | `query: ExportOrdersDto` | Trả file Excel attachment |
| `GET` | `/orders` | Bearer | `admin,user,staff` | `query: QueryOrderDto` | Danh sách orders phân trang |
| `GET` | `/orders/user/my-orders` | Bearer | `admin,user,staff` | `query: QueryOrderDto` | Orders của current user |
| `GET` | `/orders/:id` | Bearer | `admin,user,staff` | `param: id` | Chi tiết order |
| `PATCH` | `/orders/:id` | Bearer | `admin,user,staff` | `body: UpdateOrderDto` | Cập nhật order |
| `DELETE` | `/orders/:id` | Bearer | `admin,user,staff` | `param: id` | Xóa order |
| `POST` | `/orders/:id/comments` | Bearer | `admin,user,staff` | `body: { commentId }` | Gắn thêm comment vào order |
| `POST` | `/orders/:id/manual-comment` | Bearer | `admin,user,staff` | `body: CreateManualCommentDto` | Tạo manual comment và gắn vào order |
| `POST` | `/orders/:id/send-bill` | Bearer | `admin,user,staff` | `multipart/form-data`: `image`, `igUserId` | Gửi bill ảnh; `image` là field name bắt buộc |
| `DELETE` | `/orders/:id/comments/:commentId` | Bearer | `admin,user,staff` | `param: id, commentId` | Gỡ comment khỏi order |

## 7. Customers

### DTO

`CreateCustomerDto`

```json
{
  "igName": "string",
  "igId": "string?",
  "phone": "string?",
  "dayOfBirth": "ISO date?",
  "province": "string?",
  "ward": "string?",
  "street": "string?",
  "note": "string?",
  "userId": "string?"
}
```

`UpdateCustomerProfileDto`

```json
{
  "igName": "string?",
  "dayOfBirth": "ISO date?",
  "province": "string?",
  "ward": "string?",
  "street": "string?",
  "phone": "string?",
  "note": "string?"
}
```

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/customers/manual` | Bearer | `admin,staff,user` (decorator) | `body: CreateCustomerDto` | Tạo manual customer |
| `GET` | `/customers/user/my-customers` | Bearer | `admin,user,staff` (decorator) | `query: page?, limit?, search?` | Customers của current user |
| `GET` | `/customers/userId/:userId` | Bearer | `admin,staff` (decorator) | `query: page?, limit?, search?` | Customers theo userId |
| `GET` | `/customers/:customerId` | Bearer | Authenticated | `query: includeHistories=true|false?` | Chi tiết customer, có thể populate histories |
| `POST` | `/customers/:customerId/tags/:tagId` | Bearer | `admin,staff` (decorator) | none | Gán tag cho customer |
| `DELETE` | `/customers/:customerId/tags` | Bearer | `admin,staff` (decorator) | none | Gỡ tag khỏi customer |
| `GET` | `/customers/tags/:tagId` | Bearer | Authenticated | none | Danh sách customer theo tag |
| `PATCH` | `/customers/:customerId/profile` | Bearer | Authenticated | `body: UpdateCustomerProfileDto` | Cập nhật hồ sơ customer |
| `DELETE` | `/customers/:customerId` | Bearer | `admin,staff` (decorator) | none | Xóa customer và orders liên quan |

## 8. Tags

### DTO

`CreateTagDto`

```json
{
  "label": "string",
  "color": "#RRGGBB?"
}
```

`UpdateTagDto`

```json
{
  "label": "string?",
  "color": "#RRGGBB?"
}
```

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/tags` | Bearer | `admin,user` (decorator) | `body: CreateTagDto` | Tạo tag |
| `GET` | `/tags` | Bearer | Authenticated | none | Danh sách toàn bộ tag |
| `GET` | `/tags/user/my-tags` | Bearer | Authenticated | none | Tag của current user |
| `GET` | `/tags/:id` | Bearer | Authenticated | `param: id` | Chi tiết tag |
| `PATCH` | `/tags/:id` | Bearer | `admin,user` (decorator) | `body: UpdateTagDto` | Cập nhật tag |
| `DELETE` | `/tags/:id` | Bearer | `admin,user` (decorator) | `param: id` | Xóa tag |

## 9. Notifications / Push / Live Activities

### DTO

`QueryNotificationDto`

```json
{
  "page": "number=1?",
  "limit": "number=10?",
  "isRead": "boolean?",
  "type": "string?"
}
```

`RegisterExpoPushTokenDto`

```json
{
  "token": "string",
  "deviceId": "string",
  "platform": "string"
}
```

`RegisterLiveActivityPushToStartTokenDto`

```json
{
  "token": "string",
  "deviceId": "string",
  "bundleId": "string",
  "environment": "string"
}
```

`RegisterLiveActivityActivityTokenDto`

```json
{
  "liveId": "MongoId",
  "activityId": "string",
  "token": "string",
  "deviceId": "string",
  "bundleId": "string",
  "environment": "string"
}
```

### Notification endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/notifications` | Bearer | Authenticated | `query: QueryNotificationDto` | Notifications của current user |
| `GET` | `/notifications/user/:userId` | Bearer | `admin` | `query: QueryNotificationDto` | Notifications theo userId |
| `PATCH` | `/notifications/:id/read` | Bearer | Authenticated | none | Mark read |
| `PATCH` | `/notifications/read-all` | Bearer | Authenticated | none | Mark all read |
| `DELETE` | `/notifications/:id` | Bearer | Authenticated | none | Xóa 1 notification |
| `DELETE` | `/notifications` | Bearer | Authenticated | none | Xóa toàn bộ notifications của current user |

### Push endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/push/expo-token` | Bearer | Authenticated | `body: RegisterExpoPushTokenDto` | Đăng ký Expo push token |

### Live Activities endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/live-activities/push-to-start-token` | Bearer | Authenticated | `body: RegisterLiveActivityPushToStartTokenDto` | Đăng ký push-to-start token |
| `POST` | `/live-activities/activity-token` | Bearer | Authenticated | `body: RegisterLiveActivityActivityTokenDto` | Đăng ký activity token cho live |

### Internal Live Activities endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/internal/live-activities/:liveId/start` | Bearer | `admin` | `param: liveId` | Queue start live activity |
| `POST` | `/internal/live-activities/:liveId/update` | Bearer | `admin` | `param: liveId` | Queue update live activity |
| `POST` | `/internal/live-activities/:liveId/end` | Bearer | `admin` | `param: liveId` | Queue end live activity |

## 10. Instagram

### DTO

`ExchangeTokenDto`

```json
{
  "shortLivedToken": "string"
}
```

`RegisterInstagramWebhookDto`

```json
{
  "instagramUserId": "string"
}
```

`RevokeTokenDto`

```json
{
  "instagramUserId": "string"
}
```

### Auth / shop connection

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/instagram-auth/exchange-token` | Bearer | Authenticated | `body: { shortLivedToken }` | Exchange token và lưu shop vào user |
| `POST` | `/instagram-auth/register-webhook` | Bearer | Authenticated | `body: { instagramUserId }` | Register webhook IG |
| `POST` | `/instagram-auth/revoke` | Bearer | Authenticated | `body: { instagramUserId }` | Revoke token, disconnect shop |
| `GET` | `/instagram-auth/status` | Bearer | Authenticated | none | Connection status, không trả token |

### Public webhook

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/instagram/webhook` | No | Public | `hub.mode`, `hub.verify_token`, `hub.challenge` | Verify webhook với Instagram |
| `POST` | `/instagram/webhook` | No | Public | Payload IG webhook, header `x-hub-signature-256?` | Queue webhook xử lý async, trả `{ status, message, jobId }` |

## 11. Subscriptions

### DTO

`CreateSubscriptionDto`

```json
{
  "userId": "string",
  "type": "free|basic|pro|vip",
  "startDate": "ISO date?",
  "endDate": "ISO date?"
}
```

`QuerySubscriptionDto`

```json
{
  "page": "number=1?",
  "limit": "number=10?",
  "userId": "string?",
  "type": "free|basic|pro|vip?",
  "isActive": "boolean?",
  "sortBy": "string=createdAt?",
  "sortOrder": "asc|desc=desc?"
}
```

`CreateSubscriptionPlanDto`

```json
{
  "type": "free|basic|pro|vip",
  "name": "string",
  "description": "string",
  "features": ["string"],
  "orderLimit": "number >= -1",
  "shopLimit": "number >= -1?",
  "price": "number >= 0",
  "isActive": "boolean?"
}
```

`UpdateSubscriptionPlanDto`

```json
{
  "type": "free|basic|pro|vip?",
  "name": "string?",
  "description": "string?",
  "features": ["string"] ,
  "orderLimit": "number >= -1?",
  "shopLimit": "number >= -1?",
  "price": "number >= 0?",
  "isActive": "boolean?"
}
```

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/subscriptions` | Bearer | `admin` | `body: CreateSubscriptionDto` | Tạo subscription |
| `GET` | `/subscriptions` | Bearer | `admin,user,staff` | `query: QuerySubscriptionDto` | Danh sách subscription |
| `GET` | `/subscriptions/plans` | Bearer | `admin,user,staff` | none | Danh sách plan đang available |
| `POST` | `/subscriptions/plans` | Bearer | `admin` | `body: CreateSubscriptionPlanDto` | Tạo plan |
| `POST` | `/subscriptions/seed-plans` | Bearer | `admin` | none | Seed plan mặc định |
| `GET` | `/subscriptions/user/my-subscription` | Bearer | `admin,user,staff` | none | Subscription của current user |
| `GET` | `/subscriptions/user/my-subscription/check-limit` | Bearer | `admin,user,staff` | none | Check order limit current user |
| `GET` | `/subscriptions/user/:userId` | Bearer | `admin,staff` | `param: userId` | Subscription theo userId |
| `GET` | `/subscriptions/user/:userId/check-limit` | Bearer | `admin,user,staff` | `param: userId` | Check order limit theo userId |
| `POST` | `/subscriptions/user/:userId/renew` | Bearer | `admin` | `body: { type: free|basic|pro|vip }` | Renew subscription |
| `GET` | `/subscriptions/plans/:id` | Bearer | `admin,user,staff` | `param: id` | Chi tiết plan |
| `PATCH` | `/subscriptions/plans/:id` | Bearer | `admin` | `body: UpdateSubscriptionPlanDto` | Update plan |
| `DELETE` | `/subscriptions/plans/:id` | Bearer | `admin` | `param: id` | Xóa plan |
| `GET` | `/subscriptions/:id` | Bearer | `admin,user,staff` | `param: id` | Chi tiết subscription |
| `PATCH` | `/subscriptions/:id` | Bearer | `admin` | `body: UpdateSubscriptionPlanDto` | Hiện controller đang dùng cùng DTO với plan update |
| `DELETE` | `/subscriptions/:id` | Bearer | `admin` | `param: id` | Xóa subscription |

## 12. Statistics

### DTO

`QueryStatisticsDto`

```json
{
  "period": "day|week|month|year",
  "startDate": "ISO date?",
  "endDate": "ISO date?",
  "liveId": "MongoId?",
  "userId": "MongoId?"
}
```

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/statistics/revenue` | Bearer | `admin,user,staff` | `query: QueryStatisticsDto` | Revenue statistics; non-admin bị ép về current user |

## 13. Provinces

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/provinces` | No | Public | none | Danh sách tỉnh/thành |
| `GET` | `/provinces/:provinceCode/wards` | No | Public | `param: provinceCode` | Danh sách phường/xã theo mã tỉnh |

## 14. OTA

### Endpoints

| Method | Path | Auth | Role | Request | Response |
|---|---|---|---|---|---|
| `GET` | `/ota/check` | No | Public | `query: binaryVersion?` | Trả object OTA mới nhất: `version`, `downloadAndroidUrl`, `downloadIosUrl`, `updateJsonUrl` |
| `POST` | `/ota` | Cookie `adminToken` | Admin web | `multipart/form-data`: `version`, `binaryVersion`, `androidBundle`, `iosBundle` | Tạo OTA update mới |
| `POST` | `/ota/binary` | Cookie `adminToken` | Admin web | `body: { version }` | Tạo binary version |
| `GET` | `/ota/binary` | Cookie `adminToken` | Admin web | none | Danh sách binary version |

### Lưu ý

- Các endpoint OTA admin dùng `AdminAuthGuard`, lấy token từ cookie `adminToken`, không dùng Bearer token.

## 15. Admin HTML routes

Các route này phục vụ web admin page, không phải JSON API cho app, nhưng vẫn là route hiện có trong modules:

| Method | Path | Auth | Notes |
|---|---|---|---|
| `GET` | `/web/admin` | Cookie `adminToken` | Render dashboard |
| `GET` | `/web/admin/dashboard` | Cookie `adminToken` | Render dashboard |
| `GET` | `/web/admin/login` | No | Render login page |
| `GET` | `/web/admin/users` | Cookie `adminToken` | Render users page |
| `GET` | `/web/admin/users/:id` | Cookie `adminToken` | Render user detail page |
| `GET` | `/web/admin/ota` | Cookie `adminToken` | Render OTA page |
| `GET` | `/web/admin/subscriptions` | Cookie `adminToken` | Render subscriptions page |
| `GET` | `/` | No | Redirect `302` sang `/web/admin/dashboard` |

## 16. Module không có controller public

Các module dưới `src/modules` hiện không expose controller API riêng:

- `compliance`
- `firebase`

## 17. Gợi ý FE implementation

### Axios/fetch wrapper

- Tự động gắn `Authorization: Bearer <accessToken>`
- Khi `401`, gọi `/auth/refresh-token` với `refreshToken`
- Nếu refresh fail, logout về màn login

### SSE comments

- Dùng `EventSource` hoặc lib hỗ trợ custom header/cookie nếu cần
- Vì endpoint SSE hiện yêu cầu JWT guard, FE web thường sẽ cần giải pháp hỗ trợ gửi auth header qua SSE client
- Nên parse `event.data` như JSON string
- Khi disconnect thủ công, gọi endpoint `/comments/live/:liveId/stream/disconnect` hoặc endpoint theo `connectionId`

### Upload

- `users/me/message-template/images`: field file là `file`
- `users/*/shops/*/avatar`: field file là `file`
- `orders/:id/send-bill`: field file là `image`
- `ota`: field files là `androidBundle` và `iosBundle`

### Download Excel

- `GET /orders/export/excel` trả file stream
- FE nên gọi với `responseType: "blob"` rồi tạo download file phía client

