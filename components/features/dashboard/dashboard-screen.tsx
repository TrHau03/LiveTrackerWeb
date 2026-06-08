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
import { useRouter } from "next/navigation";
import { OrderStatusBadge } from "@/components/features/orders/order-status-badge";

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
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { useHeaderStore } from "@/stores/header-store";

export function DashboardScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { theme } = useTheme();
  const [period, setPeriod] = React.useState<"day" | "week" | "month" | "year" | "custom">("month");
  const [customRange, setCustomRange] = React.useState<{ startDate: string; endDate: string } | null>(null);

  // Tính toán khoảng thời gian dựa trên period
  const dateRange = React.useMemo(() => {
    if (period === "custom" && customRange) {
      return customRange;
    }
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
  }, [period, customRange]);

  // Hooks cho dữ liệu thời gian thực
  const { data: dashboardData, status: metricsStatus } = useMetrics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    period: period === "custom" ? undefined : period
  });
  const { data: revenueStats } = useRevenueStatistics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    period: period === "custom" ? undefined : period
  });

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

  // Helper để map dữ liệu biểu đồ với điền ngày trung gian (date interpolation)
  const mapSeriesData = (payload: unknown, valueKey: string) => {
    const collection = extractCollection(payload);

    // Khởi tạo map chứa tất cả ngày/tháng trong khoảng
    const dateMap = new Map<string, any>();
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);

    if (period === "year") {
      // Điền theo tháng
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      const targetEnd = new Date(end.getFullYear(), end.getMonth(), 1);
      while (current <= targetEnd) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const key = `${year}-${month}`; // "YYYY-MM"
        const name = `Thg ${current.getMonth() + 1}`;
        dateMap.set(key, {
          name,
          value: 0,
          fullDate: key,
          count: 0,
          total: 0,
          revenue: 0
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      // Điền theo ngày cho các period: day, week, month
      const current = new Date(start);
      current.setHours(0, 0, 0, 0);
      const targetEnd = new Date(end);
      targetEnd.setHours(0, 0, 0, 0);

      // Giới hạn an toàn tối đa 366 ngày
      let safetyCounter = 0;
      while (current <= targetEnd && safetyCounter < 400) {
        safetyCounter++;
        const key = current.toISOString().split('T')[0]; // "YYYY-MM-DD"
        const name = current.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        dateMap.set(key, {
          name,
          value: 0,
          fullDate: key,
          count: 0,
          total: 0,
          revenue: 0
        });
        current.setDate(current.getDate() + 1);
      }
    }

    if (collection && collection.length > 0) {
      collection.forEach((item) => {
        const val = Number(item[valueKey] ?? item.revenue ?? item.value ?? item.count ?? item.total ?? 0);
        const rawDate = item.date || item.label || item.name;
        if (!rawDate) return;

        const dateObj = new Date(rawDate as any);
        if (isNaN(dateObj.getTime())) {
          // Fallback nếu không parse được date nhưng có label dạng chuỗi
          const labelStr = String(rawDate);
          if (dateMap.has(labelStr)) {
            const existing = dateMap.get(labelStr);
            existing.value = val;
            existing.count = Number(item.count ?? item.value ?? val);
            existing.total = Number(item.total ?? item.count ?? item.value ?? val);
            existing.revenue = Number(item.revenue ?? item.value ?? val);
          }
          return;
        }

        const key = period === "year"
          ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`
          : dateObj.toISOString().split('T')[0];

        if (dateMap.has(key)) {
          const existing = dateMap.get(key);
          existing.value = val;
          existing.count = Number(item.count ?? item.value ?? val);
          existing.total = Number(item.total ?? item.count ?? item.value ?? val);
          existing.revenue = Number(item.revenue ?? item.value ?? val);
        } else {
          // Nếu key nằm ngoài khoảng (do lệch múi giờ), tự động thêm vào
          const name = period === "year"
            ? `Thg ${dateObj.getMonth() + 1}`
            : dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          dateMap.set(key, {
            name,
            value: val,
            fullDate: key,
            count: Number(item.count ?? item.value ?? val),
            total: Number(item.total ?? item.count ?? item.value ?? val),
            revenue: Number(item.revenue ?? item.value ?? val)
          });
        }
      });
    }

    const mapped = Array.from(dateMap.values());

    // Nếu chỉ có 1 điểm hoặc trống, tạo 2 điểm để Recharts vẽ vùng đẹp hơn
    if (mapped.length <= 1) {
      const single = mapped[0] || { name: '', value: 0, revenue: 0, count: 0, total: 0 };
      return [
        { ...single, name: '', value: 0, revenue: 0, count: 0, total: 0 },
        single
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
  const customersData = asRecord(metrics.customers);
  const newCustomersData = asRecord(customersData.new);
  const newCustomersCount = pickNumber(newCustomersData, ["current"]) ?? 0;
  const totalCustomersCount = pickNumber(customersData, ["total"]) ?? 0;

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
    { id: "day", label: "Ngày" },
    { id: "week", label: "Tuần" },
    { id: "month", label: "Tháng" },
    { id: "year", label: "Năm" },
  ] as const;

  const setHeader = useHeaderStore((state) => state.setHeader);
  const resetHeader = useHeaderStore((state) => state.resetHeader);

  // Chart styles based on theme
  const gridStroke = theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";
  const textFill = theme === "dark" ? "#9CA3AF" : "#9CA3AF";

  const handleDateRangeChange = React.useCallback((startIso: string, endIso: string) => {
    setPeriod("custom");
    setCustomRange({ startDate: startIso, endDate: endIso });
  }, []);

  // Cập nhật Header chung
  React.useEffect(() => {
    const startStr = dateRange.startDate.split('T')[0].split('-').reverse().join('-');
    const endStr = dateRange.endDate.split('T')[0].split('-').reverse().join('-');

    setHeader({
      title: `Xin chào, ${session.user?.fullName?.split(' ').pop() || "User"}!`,
      subtitle: "Đây là những gì đang diễn ra với shop của bạn.",
      startDate: startStr,
      endDate: endStr,
      onDateRangeChange: handleDateRangeChange,
    });

    return () => resetHeader();
  }, [dateRange, session.user, setHeader, resetHeader, handleDateRangeChange]);

  return (
    <div className="space-y-4 pb-28 lg:pb-6 pt-0">

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Doanh thu ước tính"
          value={formatVNCurrency(revenueSummary.total)}
          change={pickNumber(metrics.revenue, ["change"])}
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Tổng Đơn hàng"
          value={ordersSummary.total}
          change={pickNumber(metrics.orders, ["change"])}
          icon={<ShoppingCartIcon className="w-4 h-4" />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Bình luận"
          value={commentsSummary.total}
          icon={<MessageSquareIcon className="w-4 h-4" />}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
        />
        <StatCard
          label="Khách hàng mới"
          value={newCustomersCount}
          extra={totalCustomersCount ? `Tổng khách hàng: ${totalCustomersCount}` : null}
          icon={<UsersIcon className="w-4 h-4" />}
          iconBg="bg-rose-50"
          iconColor="text-rose-600"
        />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2 items-stretch">
        {/* Cột trái: Biểu đồ Doanh thu */}
        <Panel
          title="Báo cáo Doanh thu"
          action={<span className="text-[var(--muted)] text-xs font-medium flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {periods.find(p => p.id === period)?.label}</span>}
          className="flex flex-col h-full"
        >
          <div className="flex-1 min-h-[400px] w-full mt-3">
            {seriesStatus === "pending" ? (
              <div className="h-full w-full flex items-center justify-center">
                <LoadingState />
              </div>
            ) : (
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%" debounce={200}>
                  <AreaChart
                    data={revenueChartData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
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
                            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-strong)]">
                              <p className="text-[10px] text-[var(--muted)] font-medium mb-1">{payload[0].payload.name}</p>
                              <p className="text-sm font-semibold text-[#10B981]">Doanh thu: {formatNumber(payload[0].payload.revenue)}đ</p>
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
                      strokeWidth={3}
                      fill="url(#revenueGrad)"
                      fillOpacity={1}
                      dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border)] grid grid-cols-3 gap-4">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Tổng doanh thu</span>
              <span className="text-base font-bold text-[#10B981]">{formatNumber(revenueSummary.total)}đ</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1">T.Bình/Ngày</span>
              <span className="text-base font-bold text-[var(--foreground)]">{formatNumber(revenueSummary.avg)}đ</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Cao nhất</span>
              <span className="text-base font-bold text-[var(--foreground)]">{formatNumber(revenueSummary.max)}đ</span>
            </div>
          </div>
        </Panel>
        <div className="flex flex-col gap-3.5">
          {/* Biểu đồ Đơn hàng */}
          <Panel title="Theo dõi Đơn hàng" className="flex-1">
            <div className="h-[200px] w-full mt-3">
              <ResponsiveContainer width="100%" height="100%" debounce={200}>
                <AreaChart data={ordersChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
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
                          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-strong)]">
                            <p className="text-[10px] text-[var(--muted)] mb-1 font-medium">{payload[0].payload.name}</p>
                            <p className="text-sm font-semibold text-[var(--primary)]">Đơn hàng: {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#ordersGrad)"
                    fillOpacity={1}
                    dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 1.5, stroke: '#fff' }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2.5 flex gap-5 text-sm border-t border-[var(--border)] pt-2.5 px-2">
              <div>
                <span className="text-[10px] text-[var(--muted)] block uppercase font-medium tracking-wider">Tổng đơn</span>
                <span className="text-base font-bold text-[var(--primary)]">{ordersSummary.total}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block uppercase font-medium tracking-wider">Ngày cao nhất</span>
                <span className="text-base font-bold text-[var(--foreground)]">{ordersSummary.max}</span>
              </div>
            </div>
          </Panel>

          {/* Biểu đồ Bình luận */}
          <Panel title="Tương tác Bình luận" className="flex-1">
            <div className="h-[200px] w-full mt-3">
              <ResponsiveContainer width="100%" height="100%" debounce={200}>
                <AreaChart data={commentsChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="commentsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
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
                          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-strong)]">
                            <p className="text-[10px] text-[var(--muted)] mb-1 font-medium">{payload[0].payload.name}</p>
                            <p className="text-sm font-semibold text-[#8B5CF6]">Bình luận: {payload[0].value}</p>
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
                    strokeWidth={2.5}
                    fill="url(#commentsGrad)"
                    fillOpacity={1}
                    dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 1.5, stroke: '#fff' }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2.5 flex gap-5 text-sm border-t border-[var(--border)] pt-2.5 px-2">
              <div>
                <span className="text-[10px] text-[var(--muted)] block uppercase font-medium tracking-wider">Tổng CMT</span>
                <span className="text-base font-bold text-[#8B5CF6]">{commentsSummary.total}</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] block uppercase font-medium tracking-wider">Tỷ lệ chốt</span>
                <span className="text-base font-bold text-[var(--foreground)]">
                  {totalCommentsFromMetrics ? ((totalOrdersFromMetrics / totalCommentsFromMetrics) * 100).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-3.5">
        <Panel
          title="Đơn hàng gần đây"
          action={<button onClick={() => router.push("/orders")} className="text-[var(--muted)] text-xs font-medium hover:text-[var(--primary)] transition-colors flex items-center gap-1">Xem tất cả <TrendingUpIcon className="w-3 h-3 rotate-90" /></button>}
          className="h-full overflow-hidden"
        >
          {state.status === "loading" ? <LoadingState /> : null}
          {state.status === "error" ? <ErrorState message={state.error} /> : null}

          <div className="-mx-5 -mb-5 mt-1.5 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[var(--muted)] bg-[var(--surface-muted)]">
                <tr>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-[11px]">Mã đơn</th>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-[11px]">Khách hàng</th>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-center text-[11px]">Số lượng</th>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-[11px]">Tổng tiền</th>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-center text-[11px]">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentOrders.map((order, index) => {
                  const orderId = pickString(order, ["id", "_id", "orderCode"]) || "";
                  const customerInfo = asRecord(order.customerId);
                  const customerName = pickString(customerInfo, ["igName", "fullName", "fbName"]) || pickString(order, ["igName", "customerName"]) || "Khách hàng";
                  const avatar = pickString(customerInfo, ["avatar"]);
                  const quantity = pickNumber(order, ["quantity", "count"]) || 1;
                  const totalPrice = pickNumber(order, ["totalPrice", "amount"]) || 0;
                  const status = pickString(order, ["status"]);

                  return (
                    <tr
                      key={`${orderId || index}`}
                      onClick={() => {
                        if (orderId) {
                          sessionStorage.setItem("auto_select_order_id", orderId);
                          router.push("/orders");
                        }
                      }}
                      className="transition-all duration-200 hover:bg-[var(--hover)] cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-[var(--primary)] bg-[var(--primary-soft)] px-2.5 py-1 rounded-md transition-all group-hover:bg-[var(--primary)] group-hover:text-white">
                          #{pickString(order, ["orderCode", "code"])?.slice(-8) || "ORD-0000"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-[var(--border)] bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 relative">
                            {avatar ? (
                              <>
                                <img
                                  src={avatar}
                                  alt={customerName}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                                  }}
                                />
                                <div className="absolute inset-0 hidden items-center justify-center bg-[var(--primary-soft)] text-[var(--primary)] [.fallback-active_&]:flex">
                                  <UsersIcon className="w-3.5 h-3.5" />
                                </div>
                              </>
                            ) : (
                              <UsersIcon className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span className="font-semibold text-[var(--foreground)] text-xs group-hover:text-[var(--primary)] transition-colors">
                            {customerName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 bg-[var(--surface-muted)] text-[var(--foreground-soft)] font-semibold rounded-full text-[11px]">
                          {quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {formatNumber(totalPrice)}đ
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <OrderStatusBadge status={status} size="sm" />
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--primary)] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
