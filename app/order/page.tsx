"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OrderPaymentPageContainer } from "@/components/payment/order-payment-page-container";

function OrderPaymentContent() {
    const searchParams = useSearchParams();
    const orderCode = searchParams.get("id");
    const token = searchParams.get("token");

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
