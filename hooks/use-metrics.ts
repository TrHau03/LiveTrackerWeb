/**
 * useMetrics — React Query hook cho Dashboard metrics với bộ lọc.
 */
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { fetchMetricsDashboard, MetricsFilter } from "@/lib/services/metrics-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

export function useMetrics(filter: MetricsFilter = {}) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["metrics_dashboard", session.user?.id, filter],
    queryFn: async () => {
      const result = await fetchMetricsDashboard(session, filter);
      if (result.response) {
        applyAuthResponses([result.response], patchSession, logout);
      }
      return result.data;
    },
    enabled: !!session.accessToken,
  });
}
