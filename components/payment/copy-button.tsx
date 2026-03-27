"use client";

import { useState } from "react";
import { copyToClipboard, isClipboardAvailable } from "@/lib/clipboard-utils";
import type { CopyTarget } from "@/lib/clipboard-utils";

interface CopyButtonProps {
    text: string;
    target?: CopyTarget;
    className?: string;
}

export function CopyButton({
    text,
    target = "generic",
    className = "",
}: CopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const isAvailable = isClipboardAvailable();

    const handleCopy = async () => {
        const success = await copyToClipboard(text, target);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isAvailable) {
        return null;
    }

    return (
        <button
            onClick={handleCopy}
            className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition-all ${copied
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700 hover:bg-blue-200 active:scale-95"
                } ${className}`}
            aria-label="Copy to clipboard"
        >
            {copied ? (
                <>
                    <span className="mr-1">✓</span>
                    <span>Đã copy</span>
                </>
            ) : (
                <>
                    <span className="mr-1">📋</span>
                    <span>Copy</span>
                </>
            )}
        </button>
    );
}
