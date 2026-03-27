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
      "Không gian realtime cho một livestream, tập trung vào comment feed, trạng thái live và preview Instagram.",
    alternates: {
      canonical: absoluteUrl(`/livestreams/${encodeURIComponent(liveId)}`),
    },
  };
}

export default async function LivestreamDetailPage({ params }: PageProps) {
  const { liveId } = await params;

  return <LiveDetailScreen liveId={liveId} />;
}
