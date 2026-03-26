import type { Metadata } from "next";

import { LiveDetailScreen } from "@/components/workspace-screens";
import { absoluteUrl } from "@/lib/site";

type PageProps = {
  params: Promise<{
    liveId: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { liveId } = await params;

  return {
    title: `Livestream ${liveId}`,
    description:
      "Màn hình comment listener realtime cho livestream, dùng SSE comment stream và Instagram iframe preview.",
    alternates: {
      canonical: absoluteUrl(`/livestreams/${encodeURIComponent(liveId)}`),
    },
  };
}

export default async function LivestreamDetailPage({ params }: PageProps) {
  const { liveId } = await params;

  return <LiveDetailScreen liveId={liveId} />;
}

