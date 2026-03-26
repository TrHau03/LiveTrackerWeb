import type { Metadata } from "next";

import { DashboardScreen } from "@/components/workspace-screens";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Dashboard vận hành LiveTracker với metrics tổng quan, subscription và notification mới nhất.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
};

export default function Home() {
  return <DashboardScreen />;
}
