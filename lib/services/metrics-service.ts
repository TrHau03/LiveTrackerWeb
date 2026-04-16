/**
 * Metrics Service — Fetch filtered metrics and time-series data.
 */
import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export interface MetricsFilter {
  period?: "day" | "week" | "month" | "year";
  startDate?: string;
  endDate?: string;
  liveId?: string;
}

export interface DashboardMetrics {
  orders: { total: number; change: number; changeLabel: string };
  revenue: { total: number; change: number };
  deposit?: { total: number; change: number };
  customers: { total: number; newCount: number };
  comments: { total: number };
  lives: { total: number };
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
  revenue?: number;
}

export interface TimeSeriesData {
  series?: TimeSeriesPoint[];
  chartData?: TimeSeriesPoint[];
}

export async function fetchMetricsDashboard(session: SessionSettings, filter: MetricsFilter = {}) {
  const result = await proxyRequest<DashboardMetrics>(session, {
    path: "/users/me/metrics/dashboard",
    query: filter as any,
  });
  return result;
}

export async function fetchOrdersTimeSeries(session: SessionSettings, filter: any = {}) {
  const result = await proxyRequest<TimeSeriesData>(session, {
    path: "/users/me/metrics/orders/time-series",
    query: filter,
  });
  return result;
}

export async function fetchCommentsTimeSeries(session: SessionSettings, filter: any = {}) {
  const result = await proxyRequest<TimeSeriesData>(session, {
    path: "/users/me/metrics/comments/time-series",
    query: filter,
  });
  return result;
}
