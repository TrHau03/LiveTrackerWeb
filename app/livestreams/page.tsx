import type { Metadata } from "next";
import { Suspense } from "react";

import { absoluteUrl } from "@/lib/site";
import { LivestreamsScreen } from "@/components/features/livestreams/livestreams-screen";

export const metadata: Metadata = {
  title: "Livestreams",
  description:
    "Theo dõi các livestream đang chạy, mở vào room comment realtime và quan sát phiên live theo phong cách SaaS gọn gàng.",
  alternates: {
    canonical: absoluteUrl("/livestreams"),
  },
};

export default function LivestreamsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8 text-sm text-[var(--muted)]">
          Đang tải danh sách livestream...
        </div>
      }
    >
      <LivestreamsScreen />
    </Suspense>
  );
}
