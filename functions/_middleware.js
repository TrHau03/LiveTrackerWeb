export const onRequest = [middleware];

/**
 * Middleware để phân luồng app.livetracker.vn và pay.livetracker.vn
 * - pay.livetracker.vn: chỉ cho phép /order/* paths, redirect khác sang app.livetracker.vn
 * - app.livetracker.vn: redirect /order/* paths sang pay.livetracker.vn
 */
function middleware(context) {
    const url = new URL(context.request.url);
    const host = url.hostname;
    const pathname = url.pathname;
    const search = url.search;

    // Rule 1: pay.livetracker.vn mà path KHÔNG bắt đầu bằng /order -> redirect về app.livetracker.vn
    if (host === 'pay.livetracker.vn' && !pathname.startsWith('/order')) {
        return new Response(null, {
            status: 301,
            headers: {
                Location: `https://app.livetracker.vn${pathname}${search}`
            }
        });
    }

    // Rule 2: app.livetracker.vn mà path BẮT ĐẦU bằng /order -> redirect về pay.livetracker.vn
    if (host === 'app.livetracker.vn' && pathname.startsWith('/order')) {
        return new Response(null, {
            status: 301,
            headers: {
                Location: `https://pay.livetracker.vn${pathname}${search}`
            }
        });
    }

    // Nếu không match rules -> tiếp tục xử lý request bình thường
    return context.next();
}
