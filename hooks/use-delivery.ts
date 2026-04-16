import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { 
  DeliveryProvider, 
  DeliveryOrderHistory,
  JtCalculateFeesBizContent, 
  JtCreateOrderBizContent,
  JtCalculateFeesResult,
  DeliveryCreateOrderResult
} from "@/lib/types/delivery";
import { 
  fetchDeliveryProviders, 
  calculateJtExpressFees, 
  createJtExpressOrder,
  fetchDeliveryOrders
} from "@/lib/services/delivery-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { extractApiData } from "@/lib/proxy-client";

export function useDeliveryProviders() {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["delivery-providers"],
    queryFn: async () => {
      const response = await fetchDeliveryProviders(session);
      applyAuthResponses([response.response], patchSession, logout);
      return extractApiData<DeliveryProvider[]>(response.data) || [];
    },
    enabled: !!session.accessToken,
  });
}

export function useCalculateFees() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async (bizContent: JtCalculateFeesBizContent) => {
      const response = await calculateJtExpressFees(session, { bizContent });
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Tính phí thất bại");
      return extractApiData<JtCalculateFeesResult>(response.data);
    },
  });
}

export function useCreateDeliveryOrder() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async (bizContent: JtCreateOrderBizContent) => {
      const response = await createJtExpressOrder(session, { bizContent });
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Tạo đơn giao hàng thất bại");
      return extractApiData<DeliveryCreateOrderResult>(response.data);
    },
  });
}

export function useDeliveryOrders(query?: { page?: number; limit?: number; search?: string }) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["delivery-orders", query?.page, query?.limit, query?.search],
    queryFn: async () => {
      const response = await fetchDeliveryOrders(session, query);
      applyAuthResponses([response.response], patchSession, logout);
      return extractApiData<{ items: DeliveryOrderHistory[] }>(response.data);
    },
    enabled: !!session.accessToken,
  });
}
