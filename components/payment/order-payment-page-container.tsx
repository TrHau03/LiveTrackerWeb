"use client";

import { useEffect, useState } from "react";
import { getPublicOrderDetails } from "@/lib/order-client";
import { OrderPaymentPage } from "./order-payment-page";
import type { OrderPaymentData } from "@/lib/order-client";

interface OrderPaymentPageContainerProps {
    orderId: string;
    token?: string;
}

export function OrderPaymentPageContainer({
    orderId,
    token,
}: OrderPaymentPageContainerProps) {
    const [orderData, setOrderData] = useState<OrderPaymentData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // orderId is actually the orderCode from URL param
                const response = await getPublicOrderDetails(orderId, token);
                if (response.success && response.data) {
                    setOrderData(response.data);
                } else {
                    // Handle token-specific errors
                    if (response.statusCode === 400 || response.statusCode === 403) {
                        setError("Token truy cập không hợp lệ hoặc bị thiếu");
                    } else {
                        setError(response.message || "Không thể tải thông tin đơn hàng");
                    }
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Lỗi không xác định");
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId, token]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
                <div className="text-center">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
                    <p className="text-gray-600">Đang tải thông tin đơn hàng...</p>
                </div>
            </div>
        );
    }

    if (error || !orderData) {
        if (typeof window !== "undefined") {
            window.location.href = "https://livetracker.vn";
        }
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
                <div className="text-center">
                    <p className="text-gray-600">Đang chuyển hướng về trang chủ...</p>
                </div>
            </div>
        );
    }

    return <OrderPaymentPage orderData={orderData} />;
}
