import type { Metadata } from "next";
import { OrderPaymentPageContainer } from "@/components/payment/order-payment-page-container";

type Props = {
    params: {
        id: string;
    };
};

export function generateMetadata({ params }: Props): Metadata {
    return {
        title: `Thanh toán đơn hàng ${params.id}`,
        description: "Trang thanh toán chuyển khoản ngân hàng qua mã QR",
    };
}

/**
 * Trả về danh sách order IDs cần prerender
 * Vì không thể lấy tất cả order IDs ở build time, trả về rỗng
 * Các order khác sẽ được load client-side
 */
export function generateStaticParams() {
    return [];
}

export default function OrderPage({ params }: Props) {
    return <OrderPaymentPageContainer orderId={params.id} />;
}
