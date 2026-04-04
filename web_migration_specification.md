# Tài Liệu Đặc Tả Chuyển Đổi LiveTracker Từ Mobile Sang Web

## 1. Tổng Quan Dự Án
Chuyển đổi toàn bộ hệ thống quản lý bán hàng livestream **LiveTracker** từ phiên bản di động (React Native/Expo) sang phiên bản Web chuyên nghiệp, tối ưu hóa cho quản lý tại cửa hàng và chốt đơn quy mô lớn.

## 2. Tech Stack Đề Xuất
Để đảm bảo hiệu năng và khả năng WOW người dùng, hệ thống Web sẽ sử dụng:
- **Framework**: Next.js 15 (App Router).
- **Styling**: Tailwind CSS + Shadcn UI (cho tốc độ phát triển và giao diện B2B cao cấp).
- **State Management**: Zustand (Tái sử dụng từ bản Mobile).
- **Data Fetching**: TanStack Query (React Query) v5 (Tái sử dụng logic caching).
- **Real-time**: EventSource (SSE) cho Comment Stream.
- **Localize**: i18next (Tái sử dụng file JSON hiện có).

## 3. Kiến Trúc Và Tái Sử Dụng Code
Hệ thống Mobile hiện tại được tổ chức rất tốt, cho phép tái sử dụng khoảng 70-80% logic nghiệp vụ:

### Các phần có thể tái sử dụng gần như hoàn toàn:
- **Services (`src/services/`)**: Toàn bộ logic gọi API (Auth, Orders, Lives, Customers, v.v.). Chỉ cần điều chỉnh nhỏ ở `utils/api.ts` để bỏ các dependence của React Native.
- **Hooks (`src/hooks/`)**: Các hooks logic như `useLives`, `useOrders`, `useComments` có thể đưa thẳng vào Web.
- **Stores (`src/stores/`)**: Zustand stores cho Auth, Settings, và Theme.
- **Types (`src/types/`)**: Toàn bộ interface TypeScript.

### Các phần cần viết lại/thay thế:
- **UI Components**: Chuyển từ `View`, `Text`, `TouchableOpacity` sang `div`, `span`, `button`.
- **Navigation**: Chuyển từ React Navigation sang Next.js Link & File-based Routing.
- **Charts**: Thay `react-native-gifted-charts` bằng `Recharts` hoặc `Chart.js`.
- **Printing**: Thay thế `@haroldtran/react-native-thermal-printer` bằng giải pháp Web Printing (Window Print/PDF hoặc Web Bluetooth API).

## 4. Danh Sách Trang & Điều Hướng (Mapping)

| Mobile Screen | Web Route (Next.js) | Giao diện đề xuất |
| :--- | :--- | :--- |
| LoginScreen | `/login` | Full screen centered login |
| HomeScreen | `/dashboard` | Thống kê tổng quan (Charts, KPI) |
| LivesScreen | `/lives` | Danh sách Livestream (Dạng Grid/Table) |
| CommentsScreen | `/lives/[id]/control` | **Control Room (3 cột)** |
| OrdersScreen | `/orders` | Bảng quản lý đơn hàng (High-density Table) |
| OrderDetailScreen | `/orders/[id]` | Side drawer hoặc Page chi tiết |
| CustomersScreen | `/customers` | Quản lý khách hàng |
| SettingsScreen | `/settings` | Dashboard cài đặt tập trung |

## 5. Chức Năng Cốt Lõi - Hướng Dẫn Thực Hiện (FE Team)

### 5.1. Livestream Control Room (Trọng tâm)
Trên Web, cần tận dụng diện tích màn hình để tạo giao diện 3 cột:
- **Cột 1 (25%)**: Danh sách các phiên Live đang chạy hoặc kết thúc gần đây.
- **Cột 2 (45%)**: Luồng Comment Real-time (Sử dụng SSE từ `commentsService.getStream`).
- **Cột 3 (30%)**: Quản lý đơn hàng nhanh của phiên Live đó, xem thông tin khách hàng khi click vào comment.

### 5.2. Quản Lý Đơn Hàng & Khách Hàng
- Sử dụng **Data Table** có khả năng Filter, Sort mạnh mẽ.
- Tích hợp xuất Excel (đã có API `/orders/export/excel`).
- Hỗ trợ phím tắt để chốt đơn nhanh (Space, Enter).

### 5.3. Hệ Thống In Ấn (Thermal Printer)
Vì Web không có quyền truy cập trực tiếp vào Driver máy in như Mobile:
- **Phương án 1**: Tạo Print Template bằng HTML/CSS chuyên dụng cho khổ giấy 58mm/80mm và dùng `window.print()`.
- **Phương án 2**: Dùng **Web Bluetooth API** (nếu dùng máy in Bluetooth).
- **Phương án 3**: Local Bridge (Một app nhỏ chạy local để nhận lệnh in từ Web).

## 6. Thiết Kế UI/UX (Premium Feel)
- **Typography**: Sử dụng `Inter` hoặc `Outfit` font cho cảm giác hiện đại.
- **Color Palette**: Dark mode & Light mode (Dựa trên `useTheme` hiện có). Sử dụng các màu xanh B2B (`#0070f3`) làm chủ đạo.
- **Micro-animations**: Dùng `Framer Motion` cho các hiệu ứng chuyển trang và loading.
- **Responsiveness**: Dashboard tối ưu cho Desktop (1920x1080) và Tablet (Chốt đơn tại quầy).

## 7. Ghi Chú Kỹ Thuật Quan Trọng
1. **SSE Management**: Đảm bảo dọn dẹp (cleanup) `EventSource` khi unmount trang Control Room để tránh leak connection.
2. **Auth Persistence**: Chuyển từ `AsyncStorage` sang `Cookie` hoặc `LocalStorage` (Zustand persist middleware hỗ trợ tốt việc này).
3. **Environment**: Sử dụng `.env.local` cho `NEXT_PUBLIC_API_URL` thay cho `EXPO_PUBLIC_API_URL`.

---
*Tài liệu này được soạn thảo dựa trên phân tích cấu trúc mã nguồn thực tế của LiveTrackerApp.*
