/**
 * Statistics Service — Fetch revenue statistics.
 */
import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export interface StatisticFilter {
  period?: "day" | "week" | "month" | "year";
  startDate?: string;
  endDate?: string;
  liveId?: string;
}

export interface RevenuePoint {
  label: string;
  value: number;
}

export interface RevenueStatistics {
  totalRevenue: number;
  series: RevenuePoint[];
  conversionRate?: number;
  successCount?: number;
  pendingCount?: number;
}

export async function fetchRevenueStatistics(session: SessionSettings, filter: StatisticFilter = {}) {
  const result = await proxyRequest<RevenueStatistics>(session, {
    path: "/statistics/revenue",
    query: filter as any,
  });
  return result;
}
