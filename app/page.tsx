import type { Metadata } from "next";

import { DashboardScreen } from "@/components/workspace-screens";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Không gian điều hành trung tâm cho LiveTracker với dashboard thương mại, livestream realtime, đơn hàng và khách hàng.",
  alternates: {
    canonical: absoluteUrl("/"),
  },
};

export default function Home() {
  return <DashboardScreen />;
}
