import type { Metadata } from "next";

import { OrdersScreen } from "@/components/workspace-screens";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Orders",
  description:
    "Màn hình quản lý đơn hàng LiveTracker, tổng hợp doanh thu trang hiện tại và export Excel.",
  alternates: {
    canonical: absoluteUrl("/orders"),
  },
};

export default function OrdersPage() {
  return <OrdersScreen />;
}

