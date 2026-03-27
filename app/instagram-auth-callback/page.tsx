import type { Metadata } from "next";

import { InstagramAuthCallbackScreen } from "@/components/instagram-auth-callback-screen";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Instagram Callback",
  description:
    "Hoàn tất liên kết Instagram account và đăng ký webhook cho workspace LiveTracker.",
  alternates: {
    canonical: absoluteUrl("/instagram-auth-callback"),
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function InstagramAuthCallbackPage() {
  return <InstagramAuthCallbackScreen />;
}
