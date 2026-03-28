"use client";

import { CopyButton } from "./copy-button";
import { formatCurrency } from "@/lib/order-client";
import type { BankInfo } from "@/lib/order-client";

interface BankTransferSectionProps {
    bankInfo: BankInfo | null;
    totalPrice: number;
}

export function BankTransferSection({
    bankInfo,
    totalPrice,
}: BankTransferSectionProps) {
    if (!bankInfo) {
        return (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-6">
                <p className="text-center text-sm text-gray-600">
                    Thông tin ngân hàng chưa được cấu hình.
                </p>
            </div>
        );
    }
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
                        Chủ tài khoản
                    </p>
                    <p className="mt-1 text-base text-gray-900 font-medium">
                        {bankInfo.bankAccountName}
                    </p>
                </div>

                {/* Bank */}
                <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                            Tên ngân hàng
                        </p>
                        <p className="mt-1 text-base text-gray-900 font-medium">
                            {bankInfo.bankName}
                        </p>
                    </div>
                    <CopyButton
                        text={bankInfo.bankName}
                        target="bankName"
                        className="ml-2"
                    />
                </div>

                {/* Account Number */}
                <div className="bg-white rounded-lg p-4 flex items-center justify-between">
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-600 uppercase">
                            Số tài khoản
                        </p>
                        <p className="mt-1 text-base text-gray-900 font-mono font-bold tracking-wide">
                            {bankInfo.bankAccount}
                        </p>
                    </div>
                    <CopyButton
                        text={bankInfo.bankAccount}
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
                            {formatCurrency(totalPrice)}
                        </p>
                    </div>
                    <CopyButton
                        text={totalPrice.toString()}
                        target="amount"
                        className="ml-2"
                    />
                </div>
            </div>
        </div>
    );
}
