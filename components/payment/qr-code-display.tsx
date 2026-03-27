"use client";

import Image from "next/image";

interface QRCodeDisplayProps {
    qrCodeUrl: string;
    orderId: string;
}

export function QRCodeDisplay({
    qrCodeUrl,
    orderId,
}: QRCodeDisplayProps) {
    return (
        <div className="flex flex-col items-center justify-center bg-white px-4 py-8">
            <div className="relative h-80 w-80 overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50 shadow-md sm:h-72 sm:w-72">
                <Image
                    src={qrCodeUrl}
                    alt={`QR Code for order ${orderId}`}
                    fill
                    className="object-contain"
                    priority
                    sizes="(max-width: 640px) 320px, 300px"
                />
            </div>
            <p className="mt-4 text-center text-xs text-gray-500">
                Mã QR thanh toán cho đơn hàng {orderId}
            </p>
        </div>
    );
}
