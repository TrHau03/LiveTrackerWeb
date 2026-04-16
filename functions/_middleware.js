export const onRequest = [middleware];

/**
 * Middleware để phân luồng app.livetracker.vn và pay.livetracker.vn
 * Tối ưu hóa cho Cloudflare Pages Static Export
 */
async function middleware(context) {
    try {
        const url = new URL(context.request.url);
        const host = url.hostname;
        const pathname = url.pathname;
        const search = url.search;

        // Rule 0: Bỏ qua kiểm tra cho các file tĩnh và hệ thống (Ưu tiên hàng đầu để tránh lỗi 404/Redirect loop)
        const isNextAsset = pathname.startsWith('/_next/');
        const isStaticFile = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?|webp|html)$/i);
        const isPublicAsset = pathname.startsWith('/favicon') || pathname.startsWith('/logo');

        if (isNextAsset || isStaticFile || isPublicAsset) {
            return await context.next();
        }

        // Rule 1: Xử lý tên miền thanh toán pay.livetracker.vn
        if (host === 'pay.livetracker.vn') {
            // Chuyển đổi định dạng cũ /order/XXX sang /order?id=XXX
            const orderMatch = pathname.match(/^\/order\/([^/]+)$/);
            if (orderMatch) {
                const orderCode = orderMatch[1];
                const extraParams = search ? (search.startsWith('?') ? `&${search.substring(1)}` : `&${search}`) : '';
                return Response.redirect(`https://pay.livetracker.vn/order?id=${encodeURIComponent(orderCode)}${extraParams}`, 301);
            }

            // Kiểm tra đường dẫn trang đơn hàng (chế độ whitelist)
            const isOrderPage = pathname === '/order' || pathname === '/order/' || pathname === '/order.html';
            const hasOrderId = url.searchParams.has('id');

            // Nếu là trang order hợp lệ, cho phép đi qua
            if (isOrderPage && hasOrderId) {
                return await context.next();
            }

            // Nếu truy cập gốc hoặc các trang khác trên tên miền pay -> Đưa về trang chủ
            if (pathname === '/' || !isOrderPage) {
                return Response.redirect('https://livetracker.vn', 301);
            }
        }

        //Rule 2: app.livetracker.vn (Mặc định)
        // Nếu truy cập vào /order trên app -> Chuyển sang pay
        if (pathname.startsWith('/order') && host !== 'pay.livetracker.vn') {
            const payUrl = new URL(context.request.url);
            payUrl.hostname = 'pay.livetracker.vn';
            return Response.redirect(payUrl.toString(), 301);
        }

        return await context.next();
    } catch (e) {
        // Nếu có lỗi trong middleware, cho phép request đi tiếp để tránh sập toàn bộ trang
        console.error('Middleware Error:', e);
        return await context.next();
    }
}
