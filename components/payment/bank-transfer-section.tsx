"use client";

import Image from "next/image";
import { CopyButton } from "./copy-button";
import { formatCurrency } from "@/lib/order-client";
import type { BankInfo } from "@/lib/order-client";

interface BankTransferSectionProps {
    bankInfo: BankInfo | null;
    totalPrice: number;
    transferContent?: string;
}

export function BankTransferSection({
    bankInfo,
    totalPrice,
    transferContent,
}: BankTransferSectionProps) {
    if (!bankInfo) {
        return (
            <div className="bg-white px-4 py-6">
                <p className="text-center text-sm text-gray-600">
                    Thông tin ngân hàng chưa được cấu hình.
                </p>
            </div>
        );
    }
    return (
        <div className="bg-white px-5 py-8 md:px-8 md:py-10">
            <h2 className="mb-6 flex items-center text-base font-extrabold text-gray-900 uppercase tracking-wider">
                <span className="mr-2 text-xl">🏦</span>
                Thông tin chuyển khoản
            </h2>

            <div className="space-y-4">
                {/* Bank */}
                <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Ngân hàng thụ hưởng
                    </p>
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 transition-colors hover:bg-slate-100/50">
                        <div className="flex items-center gap-3">
                            {bankInfo.bankLogo && (
                                <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-100">
                                    <Image
                                        src={bankInfo.bankLogo}
                                        alt={bankInfo.bankName}
                                        width={32}
                                        height={32}
                                        className="object-contain"
                                        style={{ height: 'auto' }}
                                    />
                                </div>
                            )}
                            <p className="text-[14px] leading-tight text-gray-900 font-semibold md:text-base">
                                {bankInfo.bankName}
                            </p>
                        </div>
                        <CopyButton
                            text={bankInfo.bankName}
                            target="bankName"
                            className="ml-3 shrink-0"
                        />
                    </div>
                </div>

                {/* Account Number */}
                <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Số tài khoản (STK)
                    </p>
                    <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 transition-colors hover:bg-slate-100/50">
                        <p className="text-[15px] md:text-base text-gray-900 font-mono font-bold tracking-widest">
                            {bankInfo.bankAccount}
                        </p>
                        <CopyButton
                            text={bankInfo.bankAccount}
                            target="accountNumber"
                            className="ml-3 shrink-0"
                        />
                    </div>
                </div>

                {/* Recipient */}
                <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Tên thụ hưởng
                    </p>
                    <p className="text-[14px] leading-snug md:text-base text-gray-900 font-semibold bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 uppercase">
                        {bankInfo.bankAccountName}
                    </p>
                </div>

                <div className="space-y-4 pt-2">
                    {/* Amount */}
                    <div className="w-full">
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Số tiền
                        </p>
                        <div className="flex items-center justify-between h-[52px] bg-blue-50/80 border border-blue-100 rounded-xl px-4 transition-colors hover:bg-blue-50">
                            <p className="text-lg md:text-xl text-blue-700 font-extrabold mr-2">
                                {formatCurrency(totalPrice)}
                            </p>
                            <CopyButton
                                text={totalPrice.toString()}
                                target="amount"
                                className="ml-2 shrink-0"
                            />
                        </div>
                    </div>

                    {/* Transfer Content */}
                    {transferContent && (
                        <div className="w-full">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                Nội dung (Bắt buộc)
                            </p>
                            <div className="flex items-center justify-between min-h-[52px] bg-amber-50/80 border border-amber-100 rounded-xl px-4 py-2 transition-colors hover:bg-amber-50">
                                <p className="text-sm md:text-base text-amber-900 font-mono font-bold break-all mr-2">
                                    {transferContent}
                                </p>
                                <CopyButton
                                    text={transferContent}
                                    target="transferDescription"
                                    className="ml-2 shrink-0"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
