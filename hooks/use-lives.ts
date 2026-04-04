/**
 * useLives — React Query hook cho danh sách Livestream.
 */
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/components/session-provider";
import { fetchMyLives } from "@/lib/services/lives-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

export function useLives(search?: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["livestreams", session.user?.id, search],
    queryFn: async () => {
      const response = await fetchMyLives(session, {
        page: 1,
        limit: 50,
        search: search || undefined,
      });
      applyAuthResponses([response.response], patchSession, logout);
      return response.data;
    },
    enabled: !!session.accessToken,
  });
}
