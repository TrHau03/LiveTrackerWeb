"use client";

interface PaymentInstructionProps {
    orderId: string;
}

export function PaymentInstruction({
    orderId,
}: PaymentInstructionProps) {
    return (
        <div className="border-t border-gray-200 bg-yellow-50 px-4 py-6">
            <div className="flex items-start gap-3">
                <span className="flex-shrink-0 text-2xl">📌</span>
                <div>
                    <p className="text-sm font-semibold text-gray-900">
                        Sau khi chuyển khoản thành công
                    </p>
                    <p className="mt-2 text-sm text-gray-700 leading-relaxed">
                        Vui lòng <strong>chụp lại màn hình giao dịch</strong> từ ứng dụng ngân hàng để chứng minh khoản thanh toán.
                    </p>
                    <p className="mt-2 text-xs text-gray-600">
                        Mã đơn hàng: <span className="font-mono font-bold">{orderId}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
