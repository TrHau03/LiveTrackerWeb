"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";

interface QRCodeDisplayProps {
    qrUrl: string | null;
    orderCode: string;
}

export function QRCodeDisplay({
    qrUrl,
    orderCode,
}: QRCodeDisplayProps) {
    const [isSaving, setIsSaving] = useState(false);

    const handleDownloadQR = async () => {
        if (!qrUrl) return;

        try {
            setIsSaving(true);
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `QR-${orderCode}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Ảnh QR đã được lưu thành công");
        } catch (error) {
            console.error("Error downloading QR code:", error);
            toast.error("Không thể lưu ảnh QR");
        } finally {
            setIsSaving(false);
        }
    };

    if (!qrUrl) {
        return (
            <div className="flex flex-col items-center justify-center bg-white px-4 py-8">
                <p className="text-center text-sm text-gray-600">
                    Mã QR chưa được cấu hình. Vui lòng chuyển khoản theo thông tin ngân hàng bên dưới.
                </p>
            </div>
        );
    }
    return (
        <div className="flex flex-col items-center justify-center bg-white px-5 py-8 md:px-8 md:py-10 border-b border-gray-100 md:border-b-0 h-full">
            <div className="mb-5">
                <p className="text-center text-[13px] font-bold text-gray-500 uppercase tracking-widest">
                    Quét mã QR để thanh toán
                </p>
            </div>
            <div className="relative h-72 w-72 sm:h-64 sm:w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white p-3 shadow-sm transition-transform hover:scale-[1.02]">
                <Image
                    src={qrUrl}
                    alt={`QR Code for order ${orderCode}`}
                    fill
                    className="object-contain p-2"
                    priority
                    sizes="(max-width: 640px) 256px, 288px"
                />
            </div>
            <div className="mt-6 flex flex-col items-center gap-4">
                <button
                    onClick={handleDownloadQR}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 text-sm font-semibold shadow-md transition-all w-full max-w-[200px]"
                    title="Tải về ảnh QR"
                >
                    <span className="text-lg">📥</span>
                    {isSaving ? "Đang lưu..." : "Lưu ảnh QR"}
                </button>
                <p className="text-center text-[13px] text-gray-500 px-2 mt-2">
                    Mã QR tự động cập nhật số tiền và nội dung
                </p>
            </div>
        </div>
    );
}
