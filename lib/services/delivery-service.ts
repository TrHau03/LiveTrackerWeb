import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";
import type { 
  DeliveryProvider, 
  JtCreateOrderBizContent, 
  JtCalculateFeesBizContent, 
  JtCalculateFeesResult,
  DeliveryCreateOrderResult,
  DeliveryOrderHistory,
  GhnCreateOrderBizContent,
  GhnCalculateFeesBizContent,
  GhnCalculateFeesResult,
  GhnProvince,
  GhnWard,
  GhtkCreateOrderBizContent,
  GhtkCalculateFeesBizContent,
  GhtkCalculateFeesResult,
  DeliveryProviderConfig,
  DeliveryProviderConfigUpsertPayload,
  DeliveryOrderHistoryDetail,
} from "../types/delivery";

export async function fetchDeliveryProviders(session: SessionSettings) {
  return proxyRequest<DeliveryProvider[]>(session, {
    path: "/delivery/providers",
  });
}

export async function fetchProviderConfig(session: SessionSettings, provider: string) {
  return proxyRequest<DeliveryProviderConfig | null>(session, {
    path: `/delivery/providers/${provider}/config`,
  });
}

export async function upsertProviderConfig(
  session: SessionSettings,
  provider: string,
  body: DeliveryProviderConfigUpsertPayload,
) {
  return proxyRequest<DeliveryProviderConfig>(session, {
    path: `/delivery/providers/${provider}/config`,
    method: "PUT",
    body,
  });
}

export async function createJtExpressOrder(
  session: SessionSettings,
  body: { bizContent: JtCreateOrderBizContent },
) {
  return proxyRequest<{ success: boolean; data: DeliveryCreateOrderResult }>(session, {
    path: "/delivery/providers/jt-express/create-order",
    method: "POST",
    body,
  });
}

export async function calculateJtExpressFees(
  session: SessionSettings,
  body: { bizContent: JtCalculateFeesBizContent },
) {
  return proxyRequest<{ success: boolean; data: JtCalculateFeesResult }>(session, {
    path: "/delivery/providers/jt-express/calculate-fees",
    method: "POST",
    body,
  });
}

export async function createGhnOrder(
  session: SessionSettings,
  body: { bizContent: GhnCreateOrderBizContent },
) {
  return proxyRequest<{ success: boolean; data: DeliveryCreateOrderResult }>(session, {
    path: "/delivery/providers/ghn/create-order",
    method: "POST",
    body,
  });
}

export async function calculateGhnFees(
  session: SessionSettings,
  body: { bizContent: GhnCalculateFeesBizContent },
) {
  return proxyRequest<{ success: boolean; data: GhnCalculateFeesResult }>(session, {
    path: "/delivery/providers/ghn/calculate-fees",
    method: "POST",
    body,
  });
}

export async function fetchGhnProvinces(session: SessionSettings, providerConfigId?: string) {
  return proxyRequest<{ success: boolean; data: GhnProvince[] }>(session, {
    path: "/delivery/providers/ghn/provinces",
    query: providerConfigId ? { providerConfigId } : undefined
  });
}

export async function fetchGhnWards(session: SessionSettings, provinceId: number, providerConfigId?: string) {
  return proxyRequest<{ success: boolean; data: GhnWard[] }>(session, {
    path: "/delivery/providers/ghn/wards",
    query: { provinceId, ...(providerConfigId ? { providerConfigId } : {}) }
  });
}

export async function registerGhnShop(
  session: SessionSettings,
  body: { bizContent: any },
  providerConfigId?: string,
  ghnToken?: string,
) {
  const extraHeaders: Record<string, string> = {};
  if (ghnToken) {
    extraHeaders["x-ghn-token"] = ghnToken;
  }
  return proxyRequest<{ success: boolean; data: any }>(session, {
    path: "/delivery/providers/ghn/shop/register",
    method: "POST",
    body,
    query: providerConfigId ? { providerConfigId } : undefined,
    headers: extraHeaders,
  });
}

export async function createGhtkOrder(
  session: SessionSettings,
  body: GhtkCreateOrderBizContent,
) {
  return proxyRequest<{ success: boolean; data: DeliveryCreateOrderResult }>(session, {
    path: "/delivery/providers/ghtk/create-order",
    method: "POST",
    body,
  });
}

export async function calculateGhtkFees(
  session: SessionSettings,
  body: GhtkCalculateFeesBizContent,
) {
  return proxyRequest<{ success: boolean; data: GhtkCalculateFeesResult }>(session, {
    path: "/delivery/providers/ghtk/calculate-fees",
    method: "POST",
    body,
  });
}

export async function cancelDeliveryOrder(
  session: SessionSettings,
  provider: string,
  body: { bizContent: any; providerConfigId?: string },
) {
  return proxyRequest<{ success: boolean; data?: any }>(session, {
    path: `/delivery/providers/${provider}/cancel-order`,
    method: "POST",
    body,
  });
}

export async function fetchDeliveryOrderDetail(
  session: SessionSettings,
  provider: string,
  body: { bizContent: any; providerConfigId?: string },
) {
  return proxyRequest<any>(session, {
    path: `/delivery/providers/${provider}/order-detail`,
    method: "POST",
    body,
  });
}

export async function fetchDeliveryOrders(
  session: SessionSettings,
  query?: {
    page?: number;
    limit?: number;
    search?: string;
    provider?: string;
    typeCode?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  },
) {
  const queryParams: any = {};
  if (query?.page) queryParams.page = query.page;
  if (query?.limit) queryParams.limit = query.limit;
  if (query?.search) queryParams.search = query.search;
  if (query?.provider) queryParams.provider = query.provider;
  if (query?.typeCode) queryParams.typeCode = query.typeCode;
  if (query?.status) queryParams.status = query.status;
  if (query?.sortBy) queryParams.sortBy = query.sortBy;
  if (query?.sortOrder) queryParams.sortOrder = query.sortOrder;

  return proxyRequest<{ items: DeliveryOrderHistory[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(session, {
    path: "/delivery/orders",
    query: queryParams,
  });
}

export async function fetchDeliveryOrderById(session: SessionSettings, id: string) {
  return proxyRequest<DeliveryOrderHistoryDetail>(session, {
    path: `/delivery/orders/${id}`,
  });
}

