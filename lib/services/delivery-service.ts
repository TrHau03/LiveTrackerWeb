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
} from "../types/delivery";

export async function fetchDeliveryProviders(session: SessionSettings) {
  return proxyRequest<DeliveryProvider[]>(session, {
    path: "/delivery/providers",
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

export async function fetchDeliveryOrders(
  session: SessionSettings,
  query?: {
    page?: number;
    limit?: number;
    search?: string;
  },
) {
  return proxyRequest<{ items: DeliveryOrderHistory[] }>(session, {
    path: "/delivery/orders",
    query: {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      search: query?.search,
    },
  });
}
