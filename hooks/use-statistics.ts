/**
 * useStatistics — React Query hook cho thống kê doanh thu.
 */
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { fetchRevenueStatistics, StatisticFilter } from "@/lib/services/statistics-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

export function useRevenueStatistics(filter: StatisticFilter = {}) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["revenue_statistics", session.user?.id, filter],
    queryFn: async () => {
      const result = await fetchRevenueStatistics(session, filter);
      if (result.response) {
        applyAuthResponses([result.response], patchSession, logout);
      }
      return result.data;
    },
    enabled: !!session.accessToken,
  });
}
