"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LiveDetailScreen } from "@/components/workspace-screens";

function LivestreamDetailContent() {
  const searchParams = useSearchParams();
  const liveId = searchParams.get("liveId");

  if (!liveId) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-[var(--muted)]">
        Không tìm thấy ID Livestream hợp lệ.
      </div>
    );
  }

  return <LiveDetailScreen liveId={liveId} />;
}

export default function LivestreamDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8 text-sm text-[var(--muted)]">
          Đang tải thông tin...
        </div>
      }
    >
      <LivestreamDetailContent />
    </Suspense>
  );
}
