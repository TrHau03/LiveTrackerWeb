/**
 * useOrders — React Query hook cho danh sách đơn hàng.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/components/session-provider";
import { fetchMyOrders, fetchLiveOrders, exportOrdersExcel } from "@/lib/services/orders-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

export function useOrders(search?: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["orders", session.user?.id, search],
    queryFn: async () => {
      const response = await fetchMyOrders(session, {
        page: 1,
        limit: 20,
        search: search || undefined,
      });
      applyAuthResponses([response.response], patchSession, logout);
      return response.data;
    },
    enabled: !!session.accessToken,
  });
}

export function useLiveOrders(liveId: string | null) {
  const { logout, patchSession, session } = useSession();

  // Debug log
  useEffect(() => {
    console.log("useLiveOrders - liveId:", liveId);
  }, [liveId]);

  return useQuery({
    queryKey: ["live_orders", liveId],
    queryFn: async () => {
      console.log("Fetching orders for liveId:", liveId);
      const response = await fetchLiveOrders(session, liveId!);
      console.log("Orders fetched:", response.data);
      applyAuthResponses([response.response], patchSession, logout);
      return response.data;
    },
    enabled: !!session.accessToken && !!liveId,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useExportOrders() {
  const { logout, patchSession, session } = useSession();

  return async (range: { startDate: string; endDate: string }) => {
    const response = await exportOrdersExcel(session, range);
    applyAuthResponses([response.response], patchSession, logout);

    if (!response.ok) {
      URL.revokeObjectURL(response.url);
      return { ok: false, filename: "" };
    }

    const anchor = document.createElement("a");
    anchor.href = response.url;
    anchor.download = response.filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(response.url), 30000);

    return { ok: true, filename: response.filename };
  };
}
