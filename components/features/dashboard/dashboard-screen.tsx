"use client";

import React from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";
import { useSession } from "@/components/session-provider";
import { asRecord, extractApiData, extractCollection, pickNumber, pickString, formatNumber } from "@/lib/proxy-client";
import { useDashboard } from "@/hooks/use-dashboard";
import { useMetrics } from "@/hooks/use-metrics";
import { useOrdersTimeSeries, useCommentsTimeSeries } from "@/hooks/use-time-series";
import { useRevenueStatistics } from "@/hooks/use-statistics";
import { useTheme } from "@/components/theme-provider";

import {
  StatCard,
  Panel,
  LoadingState,
  ErrorState,
} from "@/components/ui/workspace-shared";
import {
  CalendarIcon,
  TrendingUpIcon,
  ShoppingCartIcon,
  MessageSquareIcon,
  UsersIcon,
} from "lucide-react";
import { useHeaderStore } from "@/lib/store/header-store";

export function DashboardScreen() {
  const { session } = useSession();
  const { theme } = useTheme();
  const [period, setPeriod] = React.useState<"day" | "week" | "month" | "year">("month");

  // Tính toán khoảng thời gian dựa trên period
  const dateRange = React.useMemo(() => {
    const end = new Date();
    const start = new Date();
    switch (period) {
      case "day":
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start.setDate(end.getDate() - 7);
        break;
      case "month":
        start.setDate(end.getDate() - 30);
        break;
      case "year":
        start.setDate(end.getDate() - 365);
        break;
    }
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  }, [period]);

  // Hooks cho dữ liệu thời gian thực
  const { data: dashboardData, status: metricsStatus } = useMetrics({ ...dateRange, period });
  const { data: revenueStats } = useRevenueStatistics({ ...dateRange, period });

  const { data: ordersSeries, status: seriesStatus } = useOrdersTimeSeries({
    ...dateRange,
    groupBy: period === "year" ? "month" : "day"
  });

  const { data: commentsSeries } = useCommentsTimeSeries({
    ...dateRange,
    groupBy: period === "year" ? "month" : "day"
  });

  // Dashboard hook cho Recent Orders
  const { data, status: dashboardStatus, error: queryError } = useDashboard();

  const state = {
    status: (metricsStatus === "pending" || dashboardStatus === "pending" || seriesStatus === "pending") ? "loading" : "ready",
    error: queryError?.message || "",
  }

  // Chuyển đổi dữ liệu từ API sang định dạng hiển thị
  const metrics = asRecord(extractApiData(dashboardData));

  // Helper để map dữ liệu biểu đồ
  const mapSeriesData = (payload: unknown, valueKey: string) => {
    const collection = extractCollection(payload);
    if (!collection || collection.length === 0) return [];

    const mapped = collection.map((item) => {
      const val = Number(item[valueKey] ?? item.revenue ?? item.value ?? item.count ?? item.total ?? 0);

      let name = 'N/A';
      const rawDate = item.date || item.label || item.name;

      if (rawDate && typeof rawDate === 'string') {
        const dateObj = new Date(rawDate);
        if (!isNaN(dateObj.getTime())) {
          name = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        } else {
          name = rawDate;
        }
      }

      return {
        name,
        value: val,
        fullDate: String(rawDate || ''),
        count: Number(item.count ?? item.value ?? 0),
        total: Number(item.total ?? item.count ?? item.value ?? 0),
        revenue: Number(item.revenue ?? item.value ?? 0)
      };
    });

    // Nếu chỉ có 1 điểm, nhân bản để Recharts vẽ được vùng Area
    if (mapped.length === 1) {
      return [
        { ...mapped[0], name: '', value: 0, revenue: 0, count: 0, total: 0 },
        mapped[0]
      ];
    }

    return mapped;
  };

  const revenueChartData = mapSeriesData(revenueStats, 'value');
  const ordersChartData = mapSeriesData(ordersSeries, 'count');
  const commentsChartData = mapSeriesData(commentsSeries, 'count');

  const getSummary = (data: Array<Record<string, any>>, key: string, fallbackTotal?: number) => {
    if (!data.length) return { total: fallbackTotal || 0, avg: 0, max: 0 };
    const values = data.map(d => Number(d[key] || 0));
    const total = values.reduce((a, b) => a + b, 0);
    return {
      total: total || fallbackTotal || 0,
      avg: Math.round(total / data.length),
      max: Math.max(...values)
    };
  };

  // Lấy tổng bình luận và doanh thu từ metrics (phòng trường hợp API time-series trả về mảng rỗng)
  const totalCommentsFromMetrics = pickNumber(metrics.comments, ["total", "count"]) ?? (typeof metrics.comments === 'number' ? metrics.comments : 0);
  const totalOrdersFromMetrics = pickNumber(metrics.orders, ["total", "count"]) ?? (typeof metrics.orders === 'number' ? metrics.orders : 0);
  const totalRevenueFromMetrics = pickNumber(metrics.revenue, ["total", "value"]) ?? (typeof metrics.revenue === 'number' ? metrics.revenue : 0);

  const revenueSummary = getSummary(revenueChartData, 'value', totalRevenueFromMetrics);
  const ordersSummary = getSummary(ordersChartData, 'value');
  const commentsSummary = getSummary(commentsChartData, 'value'); // Luôn dùng 'value' vì đã được chuẩn hóa trong mapSeriesData

  const recentOrders = extractCollection(data?.orders).slice(0, 5);

  const formatVNCurrency = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}tr`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}k`;
    return num.toString();
  };

  const periods = [
    { id: "day", label: "Hôm nay" },
    { id: "week", label: "Tuần này" },
    { id: "month", label: "Tháng này" },
    { id: "year", label: "Năm nay" },
  ] as const;

  const setHeader = useHeaderStore((state) => state.setHeader);
  const resetHeader = useHeaderStore((state) => state.resetHeader);

  // Chart styles based on theme
  const gridStroke = theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const textFill = theme === "dark" ? "#94A3B8" : "#64748B";

  // Cập nhật Header chung
  React.useEffect(() => {
    const startStr = dateRange.startDate.split('T')[0].split('-').reverse().join('-');
    const endStr = dateRange.endDate.split('T')[0].split('-').reverse().join('-');

    setHeader({
      title: `Xin chào, ${session.user?.fullName?.split(' ').pop() || "User"}!`,
      subtitle: "Đây là những gì đang diễn ra với shop của bạn.",
      startDate: startStr,
      endDate: endStr,
      customContent: (
        <div className="flex items-center gap-1 bg-[var(--surface-muted)] p-1 rounded-xl border border-[var(--border)]">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${period === p.id
                ? "bg-[#1447E6] text-white shadow-sm"
                : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]"
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )
    });

    return () => resetHeader();
  }, [period, dateRange, session.user, setHeader, resetHeader]);

  return (
    <div className="space-y-8 pb-28 lg:pb-6 pt-4">

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Doanh thu ước tính"
          value={formatVNCurrency(revenueSummary.total)}
          change={pickNumber(metrics.revenue, ["change"])}
          icon={<TrendingUpIcon className="w-5 h-5" />}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          label="Tổng Đơn hàng"
          value={ordersSummary.total}
          change={pickNumber(metrics.orders, ["change"])}
          icon={<ShoppingCartIcon className="w-5 h-5" />}
          iconBg="bg-orange-50 dark:bg-orange-900/20"
          iconColor="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          label="Bình luận"
          value={commentsSummary.total}
          icon={<MessageSquareIcon className="w-5 h-5" />}
          iconBg="bg-green-50 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Khách hàng"
          value={pickNumber(metrics.customers, ["total", "count"]) || 0}
          extra={pickNumber(metrics.customers, ["newCount", "newCustomers"]) ? `+${pickNumber(metrics.customers, ["newCount", "newCustomers"])} mới` : null}
          icon={<UsersIcon className="w-5 h-5" />}
          iconBg="bg-purple-50 dark:bg-purple-900/20"
          iconColor="text-purple-600 dark:text-purple-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        {/* Cột trái: Biểu đồ Doanh thu */}
        <Panel
          title="Báo cáo Doanh thu"
          action={<span className="text-[var(--muted)] text-xs flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {periods.find(p => p.id === period)?.label}</span>}
          className="flex flex-col h-full"
        >
          <div className="flex-1 min-h-[400px] w-full mt-4">
            {seriesStatus === "pending" ? (
              <div className="h-full w-full flex items-center justify-center">
                <LoadingState />
              </div>
            ) : (
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenueChartData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: textFill }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: textFill }}
                      tickFormatter={(val) => formatVNCurrency(val).replace('đ', '')}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-xl bg-white p-3 shadow-2xl border border-slate-100 dark:bg-slate-900 border-l-4 border-l-[#10B981]">
                              <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">{payload[0].payload.name}</p>
                              <p className="text-sm font-black text-[#10B981]">Doanh thu: {formatNumber(payload[0].payload.revenue)}đ</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#10B981"
                      strokeWidth={4}
                      fill="#10B981"
                      fillOpacity={0.15}
                      dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-4 dark:border-slate-800">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tổng doanh thu</span>
              <span className="text-lg font-black text-[#10B981]">{formatNumber(revenueSummary.total)}đ</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">T.Bình/Ngày</span>
              <span className="text-lg font-black text-slate-700 dark:text-slate-200">{formatNumber(revenueSummary.avg)}đ</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cao nhất</span>
              <span className="text-lg font-black text-slate-700 dark:text-slate-200">{formatNumber(revenueSummary.max)}đ</span>
            </div>
          </div>
        </Panel>
        <div className="flex flex-col gap-6">
          {/* Biểu đồ Đơn hàng */}
          <Panel title="Theo dõi Đơn hàng" className="flex-1">
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ordersChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis
                    dataKey="name"
                    hide={ordersChartData.length === 0}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: textFill }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: textFill }}
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl bg-white p-2 shadow-xl border border-slate-100 dark:bg-slate-900 border-l-4 border-l-[#1447E6]">
                            <p className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase">{payload[0].payload.name}</p>
                            <p className="text-sm font-black text-[#1447E6]">Đơn hàng: {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#1447E6"
                    strokeWidth={3}
                    fill="#1447E6"
                    fillOpacity={0.1}
                    dot={{ r: 3, fill: '#1447E6', strokeWidth: 1.5, stroke: '#fff' }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex gap-6 text-sm border-t border-slate-100 pt-4 px-2 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tighter">Tổng đơn</span>
                <span className="text-lg font-bold text-[#1447E6]">{ordersSummary.total}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tighter">Ngày cao nhất</span>
                <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{ordersSummary.max}</span>
              </div>
            </div>
          </Panel>

          {/* Biểu đồ Bình luận */}
          <Panel title="Tương tác Bình luận" className="flex-1">
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={commentsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
                  <XAxis
                    dataKey="name"
                    hide={commentsChartData.length === 0}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: textFill }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: textFill }}
                    width={40}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl bg-white p-2 shadow-xl border border-slate-100 dark:bg-slate-900 border-l-4 border-l-[#8B5CF6]">
                            <p className="text-[10px] text-slate-400 mb-0.5 font-bold uppercase">{payload[0].payload.name}</p>
                            <p className="text-sm font-black text-[#8B5CF6]">Bình luận: {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#8B5CF6"
                    strokeWidth={3}
                    fill="#8B5CF6"
                    fillOpacity={0.1}
                    dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 1.5, stroke: '#fff' }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex gap-6 text-sm border-t border-slate-100 pt-4 px-2 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tighter">Tổng CMT</span>
                <span className="text-lg font-bold text-[#8B5CF6]">{commentsSummary.total}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-tighter">Tỷ lệ chốt</span>
                <span className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  {totalCommentsFromMetrics ? ((totalOrdersFromMetrics / totalCommentsFromMetrics) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6">
        <Panel
          title="Đơn hàng gần đây"
          action={<button className="text-[var(--muted)] text-xs font-semibold hover:text-[#1447E6] transition-colors flex items-center gap-1">Xem tất cả <TrendingUpIcon className="w-3 h-3 rotate-90" /></button>}
          className="h-full overflow-hidden"
        >
          {state.status === "loading" ? <LoadingState /> : null}
          {state.status === "error" ? <ErrorState message={state.error} /> : null}

          <div className="-mx-5 -mb-5 mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[var(--muted)] bg-[var(--background)]">
                <tr>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Mã đơn</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Khách hàng</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Đơn giá</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-center">Số lượng</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Tổng tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentOrders.map((order, index) => (
                  <tr key={`${pickString(order, ["id", "_id", "orderCode"]) || index}`} className="transition hover:bg-[var(--hover)] group">
                    <td className="px-5 py-4 font-medium text-[var(--foreground)] opacity-70 group-hover:opacity-100 italic">#{pickString(order, ["orderCode", "code"])?.slice(-8) || "ORD-0000"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                          <UsersIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-bold text-[var(--foreground)]">{pickString(order, ["igName", "customerName"]) || "Khách hàng"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--foreground)] font-medium opacity-80">{formatNumber(pickNumber(order, ["price"]) || 0)}đ</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[var(--foreground)] font-bold rounded-lg text-[10px]">
                        {pickNumber(order, ["quantity"]) || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black text-[#1447E6]">{formatNumber(pickNumber(order, ["totalPrice", "amount"]) || 0)}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
