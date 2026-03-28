"use client";

import { formatCurrency } from "@/lib/order-client";
import type { OrderItem } from "@/lib/order-client";

interface OrderInfoSectionProps {
    items: OrderItem[];
    totalPrice: number;
    orderCode: string;
}

export function OrderInfoSection({
    items,
    totalPrice,
    orderCode,
}: OrderInfoSectionProps) {
    return (
        <div className="border-t border-gray-200 bg-white px-4 py-6">
            <h2 className="mb-4 flex items-center text-lg font-bold text-gray-900">
                <span className="mr-2 text-xl">📦</span>
                Chi tiết đơn hàng
            </h2>

            <div className="space-y-3">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                    >
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                {item.text}
                            </p>
                            <p className="text-xs text-gray-600">
                                Số lượng: {item.quantity}
                            </p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 ml-2 whitespace-nowrap">
                            {formatCurrency(item.price * item.quantity)}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4 flex items-center justify-between bg-blue-50 rounded-lg p-3">
                <p className="text-base font-bold text-gray-900">Tổng cộng</p>
                <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(totalPrice)}
                </p>
            </div>

            <p className="mt-4 text-xs text-gray-500 text-center">
                Mã đơn hàng: {orderCode}
            </p>
        </div>
    );
}
