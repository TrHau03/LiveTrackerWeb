"use client";

import Image from "next/image";
import { useState } from "react";
import { Toaster } from "sonner";
import { QRCodeDisplay } from "./qr-code-display";
import { BankTransferSection } from "./bank-transfer-section";
import { PaymentInstruction } from "./payment-instruction";
import { OrderInfoSection } from "./order-info-section";
import { SuccessModal } from "./success-modal";
import { PaymentFooter } from "./payment-footer";
import type { OrderPaymentData } from "@/lib/order-client";

interface OrderPaymentPageProps {
    orderData: OrderPaymentData;
}

export function OrderPaymentPage({
    orderData,
}: OrderPaymentPageProps) {
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleConfirmPayment = () => {
        setShowSuccessModal(true);
    };

    const handleCloseModal = () => {
        setShowSuccessModal(false);
    };

    return (
        <>
            <Toaster position="top-center" richColors closeButton />

            <div className="flex flex-col min-h-screen bg-gray-50">
                {/* Main Content */}
                <main className="flex-1 pt-2 pb-10 md:pt-6 md:pb-16 px-4 md:px-6">
                    <div className="max-w-4xl mx-auto bg-white rounded-[24px] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
                        {/* Header Section - Store Info */}
                        <div className="border-b border-gray-100 bg-white px-5 py-8 md:px-8 md:py-10 relative">
                            <div className="flex flex-col items-center justify-center">
                                {orderData.shopAvatar ? (
                                    <div className="relative mb-4">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-20 transition duration-1000"></div>
                                        <Image
                                            src={orderData.shopAvatar}
                                            alt={orderData.shopName || "Shop"}
                                            width={80}
                                            height={80}
                                            className="relative rounded-full object-cover border-4 border-white shadow-xl"
                                            priority
                                        />
                                    </div>
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-3xl border-4 border-white shadow-lg mb-4">
                                        🏪
                                    </div>
                                )}
                                {orderData.shopName && (
                                    <h2 className="text-center text-2xl md:text-3xl font-black text-gray-900 tracking-tight uppercase">
                                        {orderData.shopName}
                                    </h2>
                                )}
                            </div>
                            <div className="mt-4 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                                        Mã đơn hàng:
                                    </span>
                                    <span className="px-3 py-1 bg-gray-100 text-gray-900 font-mono font-bold rounded-lg text-sm">
                                        {orderData.orderCode}
                                    </span>
                                </div>
                                {orderData.igName && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                                            Khách hàng:
                                        </span>
                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-semibold rounded-lg text-sm max-w-[200px] truncate">
                                            {orderData.igName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Main Content - Two Column Layout on Desktop */}
                        <div className="flex flex-col">
                            {/* Top Row - QR Code + Bank Transfer */}
                            <div className="flex flex-col md:flex-row md:divide-x md:divide-gray-200">
                                {/* Left Column - QR Code */}
                                <div className="flex-1 flex flex-col">
                                    <QRCodeDisplay
                                        qrUrl={orderData.qrUrl}
                                        orderCode={orderData.orderCode}
                                    />
                                </div>

                                {/* Right Column - Bank Transfer */}
                                <div className="flex-1 flex flex-col">
                                    <BankTransferSection
                                        bankInfo={orderData.bankInfo}
                                        totalPrice={orderData.totalPrice}
                                        transferContent={orderData.transferContent}
                                    />
                                </div>
                            </div>

                            {/* Bottom Row - Order Details Full Width */}
                            <div className="border-t border-gray-200">
                                <OrderInfoSection
                                    items={orderData.items}
                                    totalPrice={orderData.totalPrice}
                                    orderCode={orderData.orderCode}
                                    igName={orderData.igName}
                                    quantity={orderData.quantity}
                                />
                            </div>
                        </div>

                        {/* Payment Instruction - Full Width */}
                        <PaymentInstruction orderCode={orderData.orderCode} />
                    </div>
                </main>

                {/* Footer */}
                <PaymentFooter />

                {/* Success Modal */}
                <SuccessModal
                    isOpen={showSuccessModal}
                    onClose={handleCloseModal}
                    orderId={orderData.orderCode}
                />
            </div>
        </>
    );
}
