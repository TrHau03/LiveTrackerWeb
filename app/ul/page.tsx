import type { Metadata } from "next";

import { Suspense } from "react";

import { InstagramAuthCallbackScreen } from "@/components/instagram-auth-callback-screen";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Instagram Link Callback",
  description:
    "Nhận callback Universal Link từ Instagram và hoàn tất việc thêm shop vào workspace LiveTracker.",
  alternates: {
    canonical: absoluteUrl("/ul"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function UniversalLinkCallbackPage() {
  return (
    <Suspense fallback={null}>
      <InstagramAuthCallbackScreen />
    </Suspense>
  );
}
