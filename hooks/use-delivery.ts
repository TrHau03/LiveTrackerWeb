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
  GhnWard,
  DeliveryProviderConfig,
  DeliveryProviderConfigUpsertPayload,
  DeliveryOrderHistoryDetail,
} from "@/types/delivery";
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
  fetchGhnWards,
  fetchProviderConfig,
  upsertProviderConfig,
  registerGhnShop,
  cancelDeliveryOrder,
  fetchDeliveryOrderDetail,
  fetchDeliveryOrderById,
  printGhnOrder,
  printGhnOrders,
  printGhtkOrder,
  printGhtkOrders,
  printJtExpressOrder,
  printJtExpressOrders,
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

export function useProviderConfig(provider: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["delivery-provider-config", provider],
    queryFn: async () => {
      const response = await fetchProviderConfig(session, provider);
      applyAuthResponses([response.response], patchSession, logout);
      return extractApiData<DeliveryProviderConfig | null>(response.data);
    },
    enabled: !!session.accessToken && !!provider,
  });
}

export function useUpsertProviderConfig() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ provider, body }: { provider: string; body: DeliveryProviderConfigUpsertPayload }) => {
      const response = await upsertProviderConfig(session, provider, body);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Cập nhật cấu hình thất bại");
      return extractApiData<DeliveryProviderConfig>(response.data);
    },
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

export function useDeliveryOrders(query?: {
  page?: number;
  limit?: number;
  search?: string;
  provider?: string;
  typeCode?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: string;
}) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["delivery-orders", query],
    queryFn: async () => {
      const response = await fetchDeliveryOrders(session, query);
      applyAuthResponses([response.response], patchSession, logout);
      return extractApiData<{ items: DeliveryOrderHistory[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(response.data);
    },
    enabled: !!session.accessToken,
  });
}

export function useDeliveryOrderById(id: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["delivery-order-detail", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetchDeliveryOrderById(session, id);
      applyAuthResponses([response.response], patchSession, logout);
      return extractApiData<DeliveryOrderHistoryDetail>(response.data);
    },
    enabled: !!session.accessToken && !!id,
  });
}

export function useCancelDeliveryOrder() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ provider, body }: { provider: string; body: { bizContent: any; providerConfigId?: string } }) => {
      const response = await cancelDeliveryOrder(session, provider, body);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Hủy vận đơn thất bại");
      return extractApiData<any>(response.data);
    },
  });
}

export function useDeliveryOrderDetail(provider: string) {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async (body: { bizContent: any; providerConfigId?: string }) => {
      const response = await fetchDeliveryOrderDetail(session, provider, body);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Lấy chi tiết vận đơn thất bại");
      return extractApiData<any>(response.data);
    },
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

export function useRegisterGhnShop() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ body, providerConfigId, ghnToken }: { body: { bizContent: any }; providerConfigId?: string; ghnToken?: string }) => {
      const response = await registerGhnShop(session, body, providerConfigId, ghnToken);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Đăng ký shop GHN thất bại");
      return extractApiData<any>(response.data);
    },
  });
}

export function usePrintDeliveryOrder() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ 
      provider, 
      orderCode, 
      providerConfigId, 
      options 
    }: { 
      provider: string; 
      orderCode: string; 
      providerConfigId?: string;
      options?: { printSize?: string; pageSize?: string; original?: string }
    }) => {
      const normalizedProvider = provider.toLowerCase().trim();
      
      if (normalizedProvider.includes("ghn")) {
        const response = await printGhnOrder(session, {
          bizContent: { 
            order_code: orderCode, 
            printSize: options?.printSize 
          },
          providerConfigId,
        });
        applyAuthResponses([response.response], patchSession, logout);
        if (!response.ok) throw new Error("Yêu cầu in vận đơn GHN thất bại");
        const resData = extractApiData<{ printUrl: string }>(response.data);
        if (resData?.printUrl) {
          window.open(resData.printUrl, "_blank");
        }
        return resData;
      } 
      
      if (normalizedProvider.includes("ghtk")) {
        const response = await printGhtkOrder(session, {
          bizContent: { 
            trackingOrder: orderCode, 
            pageSize: options?.pageSize, 
            original: options?.original 
          },
          providerConfigId,
        });
        if (!response.ok) throw new Error("Yêu cầu in vận đơn GHTK thất bại");
        if (response.url) {
          window.open(response.url, "_blank");
        }
        return response;
      }
      
      if (normalizedProvider.includes("j&t") || normalizedProvider.includes("jt")) {
        const response = await printJtExpressOrder(session, {
          bizContent: { 
            txlogisticId: orderCode, 
            billCode: orderCode 
          },
          providerConfigId,
        });
        applyAuthResponses([response.response], patchSession, logout);
        if (!response.ok) throw new Error("Yêu cầu in vận đơn J&T Express thất bại");
        const resData = extractApiData<{ labelUrl: string }>(response.data);
        if (resData?.labelUrl) {
          window.open(resData.labelUrl, "_blank");
        }
        return resData;
      }

      throw new Error(`Đơn vị vận chuyển ${provider} không hỗ trợ in trực tuyến`);
    }
  });
}

export function usePrintDeliveryOrders() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ 
      provider, 
      orderCodes, 
      providerConfigId, 
      options 
    }: { 
      provider: string; 
      orderCodes: string[]; 
      providerConfigId?: string;
      options?: { printSize?: string; pageSize?: string; original?: string }
    }) => {
      if (!orderCodes || orderCodes.length === 0) {
        throw new Error("Không có đơn hàng nào được chọn để in");
      }

      const normalizedProvider = provider.toLowerCase().trim();
      
      if (normalizedProvider.includes("ghn")) {
        const response = await printGhnOrders(session, {
          bizContent: { 
            order_codes: orderCodes, 
            printSize: options?.printSize 
          },
          providerConfigId,
        });
        applyAuthResponses([response.response], patchSession, logout);
        if (!response.ok) throw new Error("Yêu cầu in hàng loạt vận đơn GHN thất bại");
        const resData = extractApiData<{ printUrl: string }>(response.data);
        if (resData?.printUrl) {
          window.open(resData.printUrl, "_blank");
        }
        return resData;
      } 
      
      if (normalizedProvider.includes("ghtk")) {
        const response = await printGhtkOrders(session, {
          bizContent: { 
            trackingOrders: orderCodes, 
            pageSize: options?.pageSize, 
            original: options?.original 
          },
          providerConfigId,
        });
        if (!response.ok) throw new Error("Yêu cầu in hàng loạt vận đơn GHTK thất bại");
        if (response.url) {
          window.open(response.url, "_blank");
        }
        return response;
      }
      
      if (normalizedProvider.includes("j&t") || normalizedProvider.includes("jt")) {
        const response = await printJtExpressOrders(session, {
          bizContent: { 
            txlogisticIds: orderCodes 
          },
          providerConfigId,
        });
        applyAuthResponses([response.response], patchSession, logout);
        if (!response.ok) throw new Error("Yêu cầu in hàng loạt vận đơn J&T Express thất bại");
        const resData = extractApiData<Array<{ labelUrl: string }>>(response.data);
        if (Array.isArray(resData)) {
          resData.forEach((item) => {
            if (item.labelUrl) {
              window.open(item.labelUrl, "_blank");
            }
          });
        }
        return resData;
      }

      throw new Error(`Đơn vị vận chuyển ${provider} không hỗ trợ in hàng loạt`);
    }
  });
}



