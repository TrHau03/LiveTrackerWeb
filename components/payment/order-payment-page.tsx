"use client";

import { useState } from "react";
import { Toaster } from "sonner";
import { QRCodeDisplay } from "./qr-code-display";
import { BankTransferSection } from "./bank-transfer-section";
import { PaymentInstruction } from "./payment-instruction";
import { ConfirmButton } from "./confirm-button";
import { OrderInfoSection } from "./order-info-section";
import { SuccessModal } from "./success-modal";
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

            <div className="min-h-screen bg-white">
                {/* Header with order ID */}
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-4 sticky top-0 z-10">
                    <h1 className="text-center text-lg font-bold text-gray-900">
                        Thanh toán đơn hàng
                    </h1>
                    <p className="text-center text-sm text-gray-600 mt-1">
                        {orderData.orderId}
                    </p>
                </div>

                {/* Main Content - QR Code at top (above fold) */}
                <div className="flex flex-col">
                    {/* QR Code Section - Priority 1 */}
                    <QRCodeDisplay
                        qrCodeUrl={orderData.qrCodeUrl}
                        orderId={orderData.orderId}
                    />

                    {/* Bank Transfer Section - Priority 2 */}
                    <BankTransferSection
                        bankInfo={orderData.bankTransfer}
                        totalAmount={orderData.totalAmount}
                    />

                    {/* Payment Instruction - Priority 3 */}
                    <PaymentInstruction orderId={orderData.orderId} />

                    {/* Confirm Button - Priority 4 */}
                    <div className="px-4 py-4 bg-white border-t border-gray-200">
                        <ConfirmButton onClick={handleConfirmPayment} />
                    </div>

                    {/* Order Details - Scrollable Section - Priority 5 */}
                    <div className="bg-gray-50">
                        <OrderInfoSection
                            items={orderData.items}
                            totalAmount={orderData.totalAmount}
                            orderId={orderData.orderId}
                        />
                    </div>
                </div>

                {/* Success Modal */}
                <SuccessModal
                    isOpen={showSuccessModal}
                    onClose={handleCloseModal}
                    orderId={orderData.orderId}
                />
            </div>
        </>
    );
}
