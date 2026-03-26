import type { Metadata } from "next";

import { CustomersScreen } from "@/components/workspace-screens";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Customers",
  description:
    "Màn hình quản lý customer LiveTracker, gồm danh sách hồ sơ, tags và lịch sử khách hàng.",
  alternates: {
    canonical: absoluteUrl("/customers"),
  },
};

export default function CustomersPage() {
  return <CustomersScreen />;
}

