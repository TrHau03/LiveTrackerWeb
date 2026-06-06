/**
 * useOrders — React Query hook cho danh sách đơn hàng.
 */
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/components/session-provider";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { 
  updateOrderStatus, 
  updateOrder, 
  deleteOrder, 
  fetchMyOrders, 
  fetchLiveOrders, 
  exportOrdersExcel 
} from "@/lib/services/orders-service";

export function useOrders(queryMeta?: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  startDate?: string; 
  endDate?: string; 
  customerId?: string;
  hasDeposit?: boolean;
  phone?: string;
  orderCode?: string;
  customerName?: string;
  walkInCustomer?: boolean;
  tagId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: [
      "orders", 
      session.user?.id, 
      queryMeta?.page, 
      queryMeta?.limit, 
      queryMeta?.search, 
      queryMeta?.startDate, 
      queryMeta?.endDate, 
      queryMeta?.customerId,
      queryMeta?.hasDeposit,
      queryMeta?.phone,
      queryMeta?.orderCode,
      queryMeta?.customerName,
      queryMeta?.walkInCustomer,
      queryMeta?.tagId,
      queryMeta?.sortBy,
      queryMeta?.sortOrder
    ],
    queryFn: async () => {
      const response = await fetchMyOrders(session, {
        page: queryMeta?.page || 1,
        limit: queryMeta?.limit || 20,
        search: queryMeta?.search || undefined,
        fromDate: queryMeta?.startDate,
        toDate: queryMeta?.endDate,
        customerId: queryMeta?.customerId,
        hasDeposit: queryMeta?.hasDeposit,
        phone: queryMeta?.phone,
        orderCode: queryMeta?.orderCode,
        customerName: queryMeta?.customerName,
        walkInCustomer: queryMeta?.walkInCustomer,
        tagId: queryMeta?.tagId,
        sortBy: queryMeta?.sortBy,
        sortOrder: queryMeta?.sortOrder,
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

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await updateOrderStatus(session, orderId, status);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Cập nhật trạng thái thất bại");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: Record<string, unknown> }) => {
      const response = await updateOrder(session, orderId, data);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Cập nhật đơn hàng thất bại");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await deleteOrder(session, orderId);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Xóa đơn hàng thất bại");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    },
  });
}
