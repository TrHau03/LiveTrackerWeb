"use client";

import { CopyButton } from "./copy-button";
import { formatCurrency } from "@/lib/order-client";
import type { BankTransferInfo } from "@/lib/order-client";

interface BankTransferSectionProps {
    bankInfo: BankTransferInfo;
    totalAmount: number;
}

export function BankTransferSection({
    bankInfo,
    totalAmount,
}: BankTransferSectionProps) {
    return (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-6">
            <h2 className="mb-4 flex items-center text-lg font-bold text-gray-900">
                <span className="mr-2 text-xl">💳</span>
                Thông tin chuyển khoản
            </h2>

            <div className="space-y-4">
                {/* Recipient */}
                <div className="bg-white rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase">
                        Người nhận
                    </p>
                    <p className="mt-1 text-base text-gray-900 font-medium">
                        {bankInfo.recipientName}
                    </p>
                </div>

                {/* Bank */}
                <div className="bg-white rounded-lg p-4">
                    <p className="text-xs font-semibold text-gray-600 uppercase">
                        Ngân hàng
                    </p>
                    <p className="mt-1 text-base text-gray-900 font-medium">
                        {bankInfo.bankName}
                    </p>
                </div>

                {/* Account Number */}
                <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                            Số tài khoản
                        </p>
                        <p className="mt-1 text-base text-gray-900 font-mono font-bold tracking-wide">
                            {bankInfo.accountNumber}
                        </p>
                    </div>
                    <CopyButton
                        text={bankInfo.accountNumber}
                        target="accountNumber"
                        className="ml-2"
                    />
                </div>

                {/* Amount */}
                <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                            Số tiền
                        </p>
                        <p className="mt-1 text-lg text-blue-600 font-bold">
                            {formatCurrency(totalAmount)}
                        </p>
                    </div>
                    <CopyButton
                        text={totalAmount.toString()}
                        target="amount"
                        className="ml-2"
                    />
                </div>

                {/* Transfer Description */}
                <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                            Nội dung chuyển khoản
                        </p>
                        <p className="mt-1 text-base text-gray-900 font-mono font-bold">
                            {bankInfo.transferDescription}
                        </p>
                    </div>
                    <CopyButton
                        text={bankInfo.transferDescription}
                        target="transferDescription"
                        className="ml-2"
                    />
                </div>
            </div>
        </div>
    );
}
