/**
 * useDashboard — React Query hook cho Dashboard data.
 */
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/components/session-provider";
import { fetchDashboard } from "@/lib/services/dashboard-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

export function useDashboard() {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["dashboard_data", session.user?.id],
    queryFn: async () => {
      const result = await fetchDashboard(session);
      applyAuthResponses(result.responses, patchSession, logout);
      return {
        dashboard: result.dashboard.data,
        subscription: result.subscription.data,
        orders: result.orders.data,
        notifications: result.notifications.data,
      };
    },
    enabled: !!session.accessToken,
  });
}
