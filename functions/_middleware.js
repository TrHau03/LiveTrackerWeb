/**
 * Middleware Bypass Mode
 * Tạm thời vô hiệu hóa tất cả logic để chẩn đoán lỗi hệ thống
 */
export async function onRequest(context) {
    // Để mọi yêu cầu đi thẳng tới các file tĩnh (Next.js assets, pages, etc.)
    return await context.next();
}
