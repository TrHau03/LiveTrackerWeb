import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { 
  DeliveryProvider, 
  DeliveryOrderHistory,
  JtCalculateFeesBizContent, 
  JtCreateOrderBizContent,
  JtCalculateFeesResult,
  DeliveryCreateOrderResult,
  GhnCalculateFeesBizContent,
  GhnCreateOrderBizContent,
  GhnCalculateFeesResult,
  GhtkCalculateFeesBizContent,
  GhtkCreateOrderBizContent,
  GhtkCalculateFeesResult,
  GhnProvince,
  GhnWard
} from "@/lib/types/delivery";
import { 
  fetchDeliveryProviders, 
  calculateJtExpressFees, 
  createJtExpressOrder,
  fetchDeliveryOrders,
  calculateGhnFees,
  createGhnOrder,
  calculateGhtkFees,
  createGhtkOrder,
  fetchGhnProvinces,
  fetchGhnWards
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
    mutationFn: async ({ provider, bizContent }: { provider: "jt-express" | "ghn" | "ghtk", bizContent: any }) => {
      let response;
      if (provider === "jt-express") {
        response = await calculateJtExpressFees(session, { bizContent });
      } else if (provider === "ghn") {
        response = await calculateGhnFees(session, { bizContent });
      } else {
        response = await calculateGhtkFees(session, bizContent);
      }
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Tính phí thất bại");
      return extractApiData<any>(response.data);
    },
  });
}

export function useCreateDeliveryOrder() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ provider, bizContent }: { provider: "jt-express" | "ghn" | "ghtk", bizContent: any }) => {
      let response;
      if (provider === "jt-express") {
        response = await createJtExpressOrder(session, { bizContent });
      } else if (provider === "ghn") {
        response = await createGhnOrder(session, { bizContent });
      } else {
        response = await createGhtkOrder(session, bizContent);
      }
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

export function useGhnProvinces(providerConfigId?: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["ghn-provinces", providerConfigId],
    queryFn: async () => {
      const response = await fetchGhnProvinces(session, providerConfigId);
      applyAuthResponses([response.response], patchSession, logout);
      return extractApiData<GhnProvince[]>(response.data) || [];
    },
    enabled: !!session.accessToken,
  });
}

export function useGhnWards(provinceId?: number, providerConfigId?: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["ghn-wards", provinceId, providerConfigId],
    queryFn: async () => {
      if (!provinceId) return [];
      const response = await fetchGhnWards(session, provinceId, providerConfigId);
      applyAuthResponses([response.response], patchSession, logout);
      return extractApiData<GhnWard[]>(response.data) || [];
    },
    enabled: !!session.accessToken && !!provinceId,
  });
}

