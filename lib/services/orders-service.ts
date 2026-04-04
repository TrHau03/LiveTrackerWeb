/**
 * Orders Service — Fetch orders, export, create, update, delete.
 */
import { proxyRequest, proxyDownload } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export async function fetchMyOrders(
  session: SessionSettings,
  query?: {
    page?: number;
    limit?: number;
    search?: string;
    liveId?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  },
) {
  return proxyRequest(session, {
    path: "/orders/user/my-orders",
    query: {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      search: query?.search || undefined,
      liveId: query?.liveId || undefined,
      sortBy: query?.sortBy ?? "createdAt",
      sortOrder: query?.sortOrder ?? "desc",
    },
  });
}

export async function fetchLiveOrders(
  session: SessionSettings,
  liveId: string,
) {
  return proxyRequest(session, {
    path: "/orders/user/my-orders",
    query: {
      liveId,
      page: 1,
      limit: 100,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
  });
}

export async function fetchOrderDetail(
  session: SessionSettings,
  orderId: string,
) {
  return proxyRequest(session, { path: `/orders/${orderId}` });
}

export async function exportOrdersExcel(
  session: SessionSettings,
  range: { startDate: string; endDate: string; shopId?: string },
) {
  return proxyDownload(session, {
    path: "/orders/export/excel",
    query: range,
  });
}

export async function deleteOrder(
  session: SessionSettings,
  orderId: string,
) {
  return proxyRequest(session, {
    path: `/orders/${orderId}`,
    method: "DELETE",
  });
}

export async function updateOrder(
  session: SessionSettings,
  orderId: string,
  body: Record<string, unknown>,
) {
  return proxyRequest(session, {
    path: `/orders/${orderId}`,
    method: "PATCH",
    body,
  });
}
