export const onRequest = [middleware];

/**
 * Middleware để phân luồng app.livetracker.vn và pay.livetracker.vn
 * - pay.livetracker.vn: chỉ cho phép /order/* paths, redirect khác sang app.livetracker.vn
 * - app.livetracker.vn: redirect /order/* paths sang pay.livetracker.vn
 * - /order/{orderCode} → /order?id={orderCode} (convert old URL format)
 */
function middleware(context) {
    const url = new URL(context.request.url);
    const host = url.hostname;
    const pathname = url.pathname;
    const search = url.search;

    // Rule 0: Convert old URL format /order/{orderCode} to /order?id={orderCode}
    // Match /order/XXX pattern (but not /order or /order/ alone)
    const orderMatch = pathname.match(/^\/order\/([^/]+)$/);
    if (orderMatch && host === 'pay.livetracker.vn') {
        const orderCode = orderMatch[1];
        // Xử lý search: nếu có query params (như ?token=...) thì phải nối bằng & thay vì nối trực tiếp ? vào sau ?id=
        const extraParams = search ? (search.startsWith('?') ? `&${search.substring(1)}` : `&${search}`) : '';

        return new Response(null, {
            status: 301,
            headers: {
                Location: `https://pay.livetracker.vn/order?id=${encodeURIComponent(orderCode)}${extraParams}`
            }
        });
    }

    // Rule 1: pay.livetracker.vn
    if (host === 'pay.livetracker.vn') {
        // Bỏ qua kiểm tra cho các file tĩnh và hệ thống của Next.js
        const isNextAsset = pathname.startsWith('/_next/') || pathname.startsWith('/static/');
        const isStaticFile = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2?|webp)$/i);
        const isPublicAsset = pathname.startsWith('/favicon') || pathname.startsWith('/logo');

        if (isNextAsset || isStaticFile || isPublicAsset) {
            return context.next();
        }

        // Chỉ áp dụng logic chuyển hướng cho các đường dẫn trang (Pages)
        const isOrderPath = pathname === '/order' || pathname === '/order/';
        const hasOrderId = url.searchParams.has('id');

        if (!isOrderPath || !hasOrderId) {
            return new Response(null, {
                status: 301,
                headers: {
                    Location: `https://livetracker.vn`
                }
            });
        }
    }

    // Nếu không match rules -> tiếp tục xử lý request bình thường
    return context.next();
}

