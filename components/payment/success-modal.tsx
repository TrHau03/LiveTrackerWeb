"use client";

import { useState } from "react";

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    orderId: string;
}

export function SuccessModal({
    isOpen,
    onClose,
    orderId,
}: SuccessModalProps) {
    const handleClose = () => {
        // Try to close webview via postMessage
        if (typeof window !== "undefined" && window.parent !== window) {
            try {
                window.parent.postMessage({ action: "close" }, "*");
            } catch (error) {
                console.error("Failed to send close message:", error);
            }
        }
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm sm:items-center">
            <div className="w-full animate-in slide-in-from-bottom-5 rounded-t-2xl bg-white sm:max-w-md sm:rounded-2xl sm:slide-in-from-bottom-0">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <h2 className="text-lg font-bold text-gray-900">
                        Cảm ơn bạn! 🎉
                    </h2>
                    <button
                        onClick={handleClose}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition"
                        aria-label="Close modal"
                    >
                        <span className="text-2xl">✕</span>
                    </button>
                </div>

                <div className="px-6 py-6">
                    <div className="mb-6 rounded-lg bg-blue-50 p-4">
                        <p className="text-sm text-gray-700 leading-relaxed">
                            <strong>Thao tác tiếp theo:</strong>
                        </p>
                        <ol className="mt-3 space-y-2 text-sm text-gray-700">
                            <li>
                                <span className="font-semibold">1.</span> Bấm nút <span className="font-mono bg-gray-200 px-2 py-1 rounded text-xs">[X]</span> hoặc <span className="font-mono bg-gray-200 px-2 py-1 rounded text-xs">[Xong]</span> ở góc trên cùng để đóng trang này
                            </li>
                            <li>
                                <span className="font-semibold">2.</span> Quay lại đoạn chat với shop
                            </li>
                            <li>
                                <span className="font-semibold">3.</span> Gửi ảnh <strong>biên lai giao dịch</strong> làm bằng chứng
                            </li>
                        </ol>
                    </div>

                    <div className="mb-6 rounded-lg border-2 border-yellow-300 bg-yellow-50 p-3">
                        <p className="text-xs font-semibold text-yellow-900">
                            ⚠️ Quan trọng:
                        </p>
                        <p className="mt-2 text-xs text-yellow-900 leading-relaxed">
                            Shop sẽ xác nhận khoản thanh toán sau khi nhận được ảnh biên lai từ bạn.
                        </p>
                        <p className="mt-2 text-xs text-yellow-900 font-mono">
                            Mã đơn: {orderId}
                        </p>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-full rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 text-center text-base font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        Tôi đã hiểu, đóng trang
                    </button>

                    <button
                        onClick={handleClose}
                        className="mt-2 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-center text-base font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                    >
                        Hoặc bấm [X] để đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
