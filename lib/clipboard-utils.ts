"use client";

import { toast } from "sonner";

export type CopyTarget =
    | "accountNumber"
    | "amount"
    | "transferDescription"
    | "generic";

const COPY_LABELS: Record<CopyTarget, string> = {
    accountNumber: "Số tài khoản",
    amount: "Số tiền",
    transferDescription: "Nội dung chuyển khoản",
    generic: "Văn bản",
};

/**
 * Copy text to clipboard with toast notification
 */
export async function copyToClipboard(
    text: string,
    target: CopyTarget = "generic",
): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);

        const label = COPY_LABELS[target];
        toast.success(`✓ Đã sao chép ${label}`);

        return true;
    } catch (error) {
        console.error("Failed to copy:", error);
        toast.error("❌ Sao chép thất bại");
        return false;
    }
}

/**
 * Check if clipboard API is available
 */
export function isClipboardAvailable(): boolean {
    return (
        typeof window !== "undefined" &&
        !!navigator?.clipboard?.writeText
    );
}
