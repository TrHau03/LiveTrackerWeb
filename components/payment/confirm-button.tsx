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
            className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-4 text-center text-base font-bold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:from-emerald-600 hover:to-green-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
        >
            <span className="inline-block mr-2">✓</span>
            Tôi đã chuyển khoản xong
        </button>
    );
}
