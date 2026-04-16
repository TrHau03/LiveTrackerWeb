export const onRequest = [middleware];

/**
 * Middleware để phân luồng app.livetracker.vn và pay.livetracker.vn
 * Tối ưu hóa tính tương thích trên mọi trình duyệt (Safari, Chrome, iOS)
 */
async function middleware(context) {
    try {
        const url = new URL(context.request.url);
        const host = url.hostname;
        const pathname = url.pathname;
        const search = url.search;

        const PAY_DOMAIN = 'pay.livetracker.vn';
        const MAIN_DOMAIN = 'livetracker.vn';

        // Helper function để tạo redirect response chuẩn (tránh lỗi Safari "No content available")
        const redirect = (targetUrl, status = 301) => {
            return new Response(null, {
                status,
                headers: {
                    'Location': targetUrl,
                    'Cache-Control': 'no-cache'
                }
            });
        };

        // Rule 0: Whitelist Assets & System files (Luôn cho phép đi qua)
        const isNextAsset = pathname.startsWith('/_next/');
        const isStaticFile = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?|webp|html)$/i);
        const isPublicAsset = pathname.startsWith('/favicon') || pathname.startsWith('/logo');

        if (isNextAsset || isStaticFile || isPublicAsset) {
            return await context.next();
        }

        // Rule 1: Xử lý các đường dẫn đơn hàng (/order/*)
        if (pathname.startsWith('/order')) {
            // 1.1. Chuyển đổi định dạng URL cũ /order/XXX sang /order?id=XXX
            const orderMatch = pathname.match(/^\/order\/([^/]+)$/);
            if (orderMatch) {
                const orderCode = orderMatch[1];
                const extraParams = search ? (search.startsWith('?') ? `&${search.substring(1)}` : `&${search}`) : '';
                return redirect(`https://${PAY_DOMAIN}/order?id=${encodeURIComponent(orderCode)}${extraParams}`);
            }

            // 1.2. Chuyển hướng domain nếu chưa ở đúng tên miền pay.livetracker.vn
            if (host !== PAY_DOMAIN) {
                const targetUrl = new URL(url.toString());
                targetUrl.hostname = PAY_DOMAIN;
                return redirect(targetUrl.toString());
            }

            // 1.3. Kiểm tra tính hợp lệ của trang đơn hàng trên tên miền pay
            const isBaseOrderPath = pathname === '/order' || pathname === '/order/' || pathname === '/order.html';
            const hasOrderId = url.searchParams.has('id');

            if (isBaseOrderPath && hasOrderId) {
                return await context.next();
            }

            // Nếu không có id hoặc sai path -> Redirect về trang chủ
            return redirect(`https://${MAIN_DOMAIN}`);
        }

        // Rule 2: Xử lý các trang khác trên tên miền pay.livetracker.vn (không cho phép)
        if (host === PAY_DOMAIN && pathname === '/') {
            return redirect(`https://${MAIN_DOMAIN}`);
        }

        // Các trường hợp khác cho phép đi tiếp
        return await context.next();
    } catch (e) {
        console.error('Middleware Error:', e);
        return await context.next();
    }
}
