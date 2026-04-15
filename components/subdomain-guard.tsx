"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function GuardContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const hostname = window.location.hostname;
            
            // Nếu truy cập qua domain pay.livetracker.vn
            if (hostname === "pay.livetracker.vn") {
                const isOrderPage = pathname === "/order";
                const hasOrderId = searchParams.get("id");

                // Nếu không phải trang order hoặc không có id -> Redirect về trang chủ chính
                if (!isOrderPage || !hasOrderId) {
                    window.location.href = "https://livetracker.vn";
                }
            }
        }
    }, [pathname, searchParams]);

    return null;
}

export function SubdomainGuard() {
    return (
        <Suspense fallback={null}>
            <GuardContent />
        </Suspense>
    );
}
