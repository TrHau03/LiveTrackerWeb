import type { Metadata } from "next";

import { LivestreamsScreen } from "@/components/workspace-screens";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Livestreams",
  description:
    "Theo dõi các livestream đang chạy, mở vào room comment realtime và quan sát phiên live theo phong cách SaaS gọn gàng.",
  alternates: {
    canonical: absoluteUrl("/livestreams"),
  },
};

export default function LivestreamsPage() {
  return <LivestreamsScreen />;
}
