import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";
import type { 
  DeliveryProvider, 
  JtCreateOrderBizContent, 
  JtCalculateFeesBizContent, 
  JtCalculateFeesResult,
  DeliveryCreateOrderResult,
  DeliveryOrderHistory
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
