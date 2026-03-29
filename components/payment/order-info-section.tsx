"use client";

import { formatCurrency } from "@/lib/order-client";
import type { OrderItem } from "@/lib/order-client";

interface OrderInfoSectionProps {
    items: OrderItem[];
    totalPrice: number;
    orderCode: string;
    igName?: string;
    quantity?: number;
}

export function OrderInfoSection({
    items,
    totalPrice,
    orderCode,
    igName,
    quantity,
}: OrderInfoSectionProps) {
    return (
        <div className="bg-gray-50 px-4 py-6 md:px-6 md:py-6">
            <h2 className="mb-4 flex items-center text-base font-bold text-gray-900 uppercase tracking-wide">
                <span className="mr-2 text-lg">📦</span>
                Chi tiết đơn hàng
            </h2>

            {/* Customer Info */}
            {(igName || quantity) && (
                <div className="mb-4 bg-blue-50 rounded-lg border border-blue-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    {igName && (
                        <div>
                            <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Khách hàng</p>
                            <p className="text-sm font-bold text-gray-900">@{igName}</p>
                        </div>
                    )}
                    {quantity && (
                        <div>
                            <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Tổng số lượng sản phẩm</p>
                            <p className="text-sm font-bold text-gray-900">{quantity} sản phẩm</p>
                        </div>
                    )}
                </div>
            )}

            {/* Items List */}
            <div className="mb-3 bg-white rounded-lg border border-gray-200 overflow-hidden">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                        <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                {item.text}
                            </p>
                            <p className="text-xs text-gray-500">
                                Số lượng: {item.quantity}
                            </p>
                        </div>
                        <p className="text-sm font-bold text-gray-900 ml-3 whitespace-nowrap">
                            {formatCurrency(item.price * item.quantity)}
                        </p>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 flex items-center justify-between shadow-sm">
                <p className="text-sm font-bold text-gray-900 uppercase">Tổng cộng</p>
                <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(totalPrice)}
                </p>
            </div>

            <div className="mt-4 text-center border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-500">
                    Mã đơn hàng: <span className="font-semibold text-gray-700">{orderCode}</span>
                </p>
            </div>
        </div>
    );
}
