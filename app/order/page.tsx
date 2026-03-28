"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OrderPaymentPageContainer } from "@/components/payment/order-payment-page-container";

function OrderPaymentContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get("id");

    if (!orderId) {
        return (
            <div className="flex items-center justify-center p-8 text-sm text-[var(--muted)]">
                Không tìm thấy ID đơn hàng hợp lệ.
            </div>
        );
    }

    return <OrderPaymentPageContainer orderId={orderId} />;
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
