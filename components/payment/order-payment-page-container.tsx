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
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center border border-red-100">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Không thể tải thông tin</h2>
                    <p className="text-gray-600 mb-8">
                        {error || "Đã xảy ra lỗi không xác định khi tải thông tin đơn hàng."}
                    </p>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-200"
                        >
                            Tải lại trang
                        </button>
                        <a 
                            href="https://livetracker.vn"
                            className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-2xl transition-all border border-gray-200"
                        >
                            Quay về trang chủ
                        </a>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                            ID: {orderId} | Domain: {typeof window !== "undefined" ? window.location.hostname : "N/A"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return <OrderPaymentPage orderData={orderData} />;
}
