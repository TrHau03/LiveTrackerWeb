"use client";

import { CopyButton } from "./copy-button";

interface TransferContentSectionProps {
    transferContent: string;
    fallbackOrderCode?: string;
}

export function TransferContentSection({
    transferContent,
    fallbackOrderCode,
}: TransferContentSectionProps) {
    const displayContent = transferContent || fallbackOrderCode || "";

    if (!displayContent) {
        return null;
    }

    return (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-orange-400 rounded-lg px-4 md:px-6 py-4 md:py-5">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-2 tracking-wide">
                📝 Nội dung chuyển khoản
            </p>
            <div className="flex items-center justify-between gap-3">
                <p className="text-base md:text-lg font-mono font-bold text-gray-900 break-all">
                    {displayContent}
                </p>
                <CopyButton
                    text={displayContent}
                    target="transferContent"
                    className="flex-shrink-0"
                />
            </div>
            <p className="text-xs text-gray-500 mt-2">
                💡 Sao chép nội dung trên và dán vào phần "Nội dung chuyển khoản" khi thanh toán tại ngân hàng
            </p>
        </div>
    );
}
