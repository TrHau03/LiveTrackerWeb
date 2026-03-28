"use client";

import Image from "next/image";

interface QRCodeDisplayProps {
    qrUrl: string | null;
    orderCode: string;
}

export function QRCodeDisplay({
    qrUrl,
    orderCode,
}: QRCodeDisplayProps) {
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
        <div className="flex flex-col items-center justify-center bg-white px-4 py-8">
            <div className="relative h-80 w-80 overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50 shadow-md sm:h-72 sm:w-72">
                <Image
                    src={qrUrl}
                    alt={`QR Code for order ${orderCode}`}
                    fill
                    className="object-contain"
                    priority
                    sizes="(max-width: 640px) 320px, 300px"
                />
            </div>
            <p className="mt-4 text-center text-xs text-gray-500">
                Mã QR thanh toán cho đơn hàng {orderCode}
            </p>
        </div>
    );
}
