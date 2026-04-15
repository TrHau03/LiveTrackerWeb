/**
 * useLives — React Query hook cho danh sách Livestream.
 */
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/components/session-provider";
import { fetchMyLives } from "@/lib/services/lives-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

export interface UseLivesFilters {
  search?: string;
  shopId?: string;
  startDate?: string;
  endDate?: string;
}

export function useLives(filters?: UseLivesFilters) {
  const { logout, patchSession, session } = useSession();
  
  const { search, shopId, startDate, endDate } = filters || {};

  return useQuery({
    queryKey: ["livestreams", session.user?.id, search, shopId, startDate, endDate],
    queryFn: async () => {
      const response = await fetchMyLives(session, {
        page: 1,
        limit: 50,
        search: search || undefined,
        shopId: shopId === "all" ? undefined : shopId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      applyAuthResponses([response.response], patchSession, logout);
      return response.data;
    },
    enabled: !!session.accessToken,
  });
}
