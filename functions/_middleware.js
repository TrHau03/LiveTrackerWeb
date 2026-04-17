/**
 * Cloudflare Pages Middleware - Domain-based Routing
 *
 * Rules:
 * - pay.livetracker.vn/order/{orderId}?token={token} → serve order page (public)
 * - pay.livetracker.vn/* (anything else)              → redirect to livetracker.vn
 * - app.livetracker.vn/*                              → pass through (no redirect)
 * - localhost / dev environments                      → pass through
 */
export async function onRequest(context) {
    const url = new URL(context.request.url);
    const hostname = url.hostname;
    const pathname = url.pathname;

    // 1. Skip non-production environments (localhost, IP, dev)
    if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.startsWith("192.168.")
    ) {
        return context.next();
    }

    // 2. Always pass through static assets (JS, CSS, images, fonts, etc.)
    if (
        pathname.startsWith("/_next/") ||
        pathname.startsWith("/favicon") ||
        pathname.startsWith("/logo") ||
        /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|json|txt|xml|map)$/.test(pathname)
    ) {
        return context.next();
    }

    // 3. Handle pay.livetracker.vn
    if (hostname === "pay.livetracker.vn") {
        // Valid pattern: /order/{orderId}?token={token}
        // orderId examples: 260417-TcFF, 260329-xYz
        const orderPathMatch = pathname.match(/^\/order\/([a-zA-Z0-9_-]+)$/);
        const token = url.searchParams.get("token");

        if (orderPathMatch && token) {
            // Rewrite: serve the /order static page but keep browser URL intact
            // The client-side JS will read orderId from window.location.pathname
            const assetUrl = new URL(context.request.url);
            assetUrl.pathname = "/order";
            assetUrl.search = "";
            return context.env.ASSETS.fetch(assetUrl.toString());
        }

        // Everything else on pay.livetracker.vn → redirect to livetracker.vn
        return Response.redirect("https://livetracker.vn", 302);
    }

    // 4. app.livetracker.vn → pass through (never redirect)
    // 5. All other domains → pass through
    return context.next();
}
