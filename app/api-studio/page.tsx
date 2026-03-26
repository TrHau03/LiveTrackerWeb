import type { Metadata } from "next";

import { IntegrationHub } from "@/components/integration-hub";
import { getApiCatalog } from "@/lib/api-catalog";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "API Studio",
  description:
    "Trung tâm thao tác toàn bộ endpoint trong FE_API_INTEGRATION.md, bao gồm upload, download, SSE và admin routes.",
  alternates: {
    canonical: absoluteUrl("/api-studio"),
  },
};

export default function ApiStudioPage() {
  const catalog = getApiCatalog();

  return <IntegrationHub catalog={catalog} />;
}

