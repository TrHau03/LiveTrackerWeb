import type { Metadata } from "next";

import { CustomersScreen } from "@/components/workspace-screens";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Customers",
  description:
    "Màn hình customer intelligence với hồ sơ, tags và lịch sử tương tác trong trải nghiệm SaaS tối giản.",
  alternates: {
    canonical: absoluteUrl("/customers"),
  },
};

export default function CustomersPage() {
  return <CustomersScreen />;
}
