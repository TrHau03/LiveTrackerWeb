/**
 * Dashboard Service — Fetch dashboard metrics, subscription, recent orders, notifications.
 */
import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export async function fetchDashboard(session: SessionSettings) {
  const [dashboard, subscription, orders, notifications] = await Promise.all([
    proxyRequest(session, { path: "/users/me/metrics/dashboard" }),
    proxyRequest(session, { path: "/subscriptions/user/my-subscription" }),
    proxyRequest(session, {
      path: "/orders/user/my-orders",
      query: { page: 1, limit: 6 },
    }),
    proxyRequest(session, {
      path: "/notifications",
      query: { page: 1, limit: 4 },
    }),
  ]);

  return {
    dashboard,
    subscription,
    orders,
    notifications,
    responses: [
      dashboard.response,
      subscription.response,
      orders.response,
      notifications.response,
    ],
  };
}
