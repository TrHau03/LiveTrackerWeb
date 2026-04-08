/**
 * useTags — React Query hook cho danh sách nhãn khách hàng.
 */
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/components/session-provider";
import { proxyRequest } from "@/lib/proxy-client";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

export function useTags() {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["tags", session.user?.id],
    queryFn: async () => {
      const response = await proxyRequest(session, {
        path: "/tags/user/my-tags",
      });
      applyAuthResponses([response.response], patchSession, logout);
      return response.data;
    },
    enabled: !!session.accessToken,
    staleTime: 5 * 60 * 1000, // Cache 5 phút
  });
}
