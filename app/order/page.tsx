"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { OrderPaymentPageContainer } from "@/components/payment/order-payment-page-container";

function OrderPaymentContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    // State: undefined = still loading, null = not found, string = found
    const [orderCode, setOrderCode] = useState<string | null | undefined>(undefined);

    useEffect(() => {
        // Priority 1: Read orderId from path segment /order/{orderId}
        // Example: /order/260417-TcFF → "260417-TcFF"
        const pathSegments = window.location.pathname.split("/").filter(Boolean);
        if (pathSegments.length >= 2 && pathSegments[0] === "order" && pathSegments[1]) {
            setOrderCode(pathSegments[1]);
            return;
        }

        // Priority 2: Fallback to query param ?id=xxx (backward compatible)
        const params = new URLSearchParams(window.location.search);
        const idParam = params.get("id");
        setOrderCode(idParam); // null if not found
    }, []);

    // Still determining orderId
    if (orderCode === undefined) {
        return (
            <div className="flex items-center justify-center p-8 text-sm text-[var(--muted)]">
                Đang tải...
            </div>
        );
    }

    if (!orderCode) {
        return (
            <div className="flex items-center justify-center p-8 text-sm text-[var(--muted)]">
                Không tìm thấy mã đơn hàng hợp lệ.
            </div>
        );
    }

    return <OrderPaymentPageContainer orderId={orderCode} token={token || undefined} />;
}

export default function OrderPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center p-8 text-sm text-[var(--muted)]">
                    Đang tải thông tin đơn hàng...
                </div>
            }
        >
            <OrderPaymentContent />
        </Suspense>
    );
}
