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
        const isTokenError = error?.includes("Token");
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
                <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">
                        ⚠️ {isTokenError ? "Link thanh toán đã hết hạn" : "Đường dẫn không hợp lệ"}
                    </h1>
                    <p className="mt-2 text-gray-600">
                        {isTokenError
                            ? "Token truy cập không hợp lệ hoặc bị thiếu. Link thanh toán này không còn giá trị."
                            : "Link thanh toán này không tồn tại hoặc đã hết hạn."}
                    </p>
                    <p className="mt-4 text-sm text-gray-500">
                        Vui lòng quay lại chat để lấy link thanh toán mới hoặc liên hệ với cửa hàng.
                    </p>
                </div>
            </div>
        );
    }

    return <OrderPaymentPage orderData={orderData} />;
}
