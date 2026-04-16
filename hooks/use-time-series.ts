/**
 * useTimeSeries — React Query hook cho dữ liệu biểu đồ (Time-series).
 */
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { 
  fetchOrdersTimeSeries, 
  fetchCommentsTimeSeries 
} from "@/lib/services/metrics-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

export function useOrdersTimeSeries(filter: any = {}) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["orders_time_series", session.user?.id, filter],
    queryFn: async () => {
      const result = await fetchOrdersTimeSeries(session, filter);
      if (result.response) {
        applyAuthResponses([result.response], patchSession, logout);
      }
      return result.data; // Now typed as TimeSeriesData
    },
    enabled: !!session.accessToken,
  });
}

export function useCommentsTimeSeries(filter: any = {}) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["comments_time_series", session.user?.id, filter],
    queryFn: async () => {
      const result = await fetchCommentsTimeSeries(session, filter);
      if (result.response) {
        applyAuthResponses([result.response], patchSession, logout);
      }
      return result.data; // Now typed as TimeSeriesData
    },
    enabled: !!session.accessToken,
  });
}
