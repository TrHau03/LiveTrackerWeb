import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/livestreams"),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: absoluteUrl("/orders"),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: absoluteUrl("/customers"),
      changeFrequency: "daily",
      priority: 0.85,
    },
  ];
}
