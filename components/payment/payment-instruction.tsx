"use client";

interface PaymentInstructionProps {
    orderCode: string;
}

export function PaymentInstruction({
    orderCode,
}: PaymentInstructionProps) {
    return (
        <div className="bg-amber-50 px-4 py-5 md:px-6 md:py-5 border-y border-amber-200">
            <div className="flex gap-3">
                <div className="flex-shrink-0 text-xl mt-0.5">📌</div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 mb-2">
                        Sau khi chuyển khoản thành công
                    </p>
                    <p className="text-xs text-gray-700 leading-relaxed">
                        Vui lòng <span className="font-semibold">chụp lại màn hình giao dịch</span> từ ứng dụng ngân hàng để chứng minh khoản thanh toán của bạn.
                    </p>
                    <p className="text-xs text-gray-600 mt-3">
                        Mã đơn hàng: <span className="font-mono font-bold text-gray-900">{orderCode}</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
