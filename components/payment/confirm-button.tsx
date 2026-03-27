"use client";

interface ConfirmButtonProps {
    onClick: () => void;
    disabled?: boolean;
}

export function ConfirmButton({
    onClick,
    disabled = false,
}: ConfirmButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="w-full rounded-lg bg-gradient-to-r from-green-500 to-green-600 px-6 py-4 text-center text-lg font-bold text-white shadow-lg transition-all hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <span className="inline-block mr-2">✓</span>
            Tôi đã chuyển khoản xong
        </button>
    );
}
