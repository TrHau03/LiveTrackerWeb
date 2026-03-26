import type { Metadata } from "next";

import { LivestreamsScreen } from "@/components/workspace-screens";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Livestreams",
  description:
    "Danh sách livestream đang nghe webhook, mở sang màn hình comment listener realtime và Instagram preview.",
  alternates: {
    canonical: absoluteUrl("/livestreams"),
  },
};

export default function LivestreamsPage() {
  return <LivestreamsScreen />;
}

