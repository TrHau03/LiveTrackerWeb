import type { Metadata } from "next";

import { OrdersScreen } from "@/components/workspace-screens";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Orders",
  description:
    "Bảng điều hành đơn hàng cho đội vận hành, tổng hợp doanh thu và xuất dữ liệu nhanh cho LiveTracker.",
  alternates: {
    canonical: absoluteUrl("/orders"),
  },
};

export default function OrdersPage() {
  return <OrdersScreen />;
}
