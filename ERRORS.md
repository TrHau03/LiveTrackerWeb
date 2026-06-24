# ERRORS.md - Trình theo dõi lỗi tự động & Học tập

Tệp này ghi lại các lỗi gặp phải trong quá trình phát triển để tránh lặp lại chúng.

---

## [2026-06-24 14:11] - Build thất bại do thiếu import font Inter trong layout.tsx

- **Type**: Agent
- **Severity**: High
- **File**: `app/layout.tsx:2`
- **Agent**: Jarvis
- **Root Cause**: Trong lần chỉnh sửa trước để chuyển đổi font chữ từ Manrope sang Inter, lệnh thay thế chỉ cập nhật phần cấu hình khởi tạo `const inter = Inter(...)` mà không cập nhật dòng `import` ở đầu tệp `app/layout.tsx` (dòng 2 vẫn import `Manrope`).
- **Error Message**: 
  ```
  ./app/layout.tsx:13:15
  Type error: Cannot find name 'Inter'. Did you mean 'inter'?
  ```
- **Fix Applied**: Đã thay đổi dòng import ở đầu tệp `app/layout.tsx` từ `import { Manrope }` thành `import { Inter }`.
- **Prevention**: Khi thay thế cấu hình font hoặc bất kỳ tài nguyên bên ngoài nào, phải rà soát và cập nhật đồng thời cả phần import ở đầu tệp tin.
- **Status**: Fixed

---
