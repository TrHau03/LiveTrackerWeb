"use client";

import React, { useState, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { useOrders, useExportOrders } from "@/hooks/use-orders";
import { useMetrics } from "@/hooks/use-metrics";
import { useHeaderStore } from "@/lib/store/header-store";
import { useSettingsStore } from "@/stores/settings-store";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import { asRecord, extractApiData, extractCollection, pickString, pickNumber, formatCurrency, formatDateTime } from "@/lib/proxy-client";
import { printReceiptHtml } from "@/lib/printUtils";
import { OrderReceipt } from "@/components/print/OrderReceipt";
import { 
  compactAddress,
  StatCard,
  Panel,
  LoadingState,
  ErrorState,
  EmptyState,
  CONTROL_CLASS,
  PRIMARY_BUTTON_CLASS
} from "@/components/ui/workspace-shared";
import { DeliveryModal } from "./delivery-modal";

import { 
  ShoppingBag, 
  DollarSign, 
  CheckCircle2, 
  Truck, 
  Clock, 
  User, 
  Search as SearchIcon, 
  Printer, 
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  Package,
  FileDown,
  LayoutGrid,
  List,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
  MoreVertical,
  X,
  ExternalLink,
  ChevronUp,
  Download,
  Filter,
  RefreshCcw,
  ArrowRight,
  MapPin,
  ClipboardCheck,
  Ban,
  Tag
} from "lucide-react";

import { useRevenueStatistics } from "@/hooks/use-statistics";

export function OrdersScreen() {
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState<{ current: number; total: number } | null>(null);
  const { getPrintSettings } = usePrintSettings();
  const setHeader = useHeaderStore((state) => state.setHeader);
  const [page, setPage] = useState(1);

  const [period, setPeriod] = useState<"today" | "yesterday" | "recent">("today");
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Reset page when filter changes
  React.useEffect(() => {
    setPage(1);
  }, [search, period]);

  const dateRange = React.useMemo(() => {
    const now = new Date();
    if (period === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    if (period === "yesterday") {
      const start = new Date(now);
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
    return { startDate: undefined, endDate: undefined };
  }, [period]);

  const { data, status, error: queryError } = useOrders({ 
    page, 
    search, 
    startDate: dateRange.startDate || undefined, 
    endDate: dateRange.endDate || undefined
  });

  const { data: metricsData } = useMetrics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    period: period === "today" ? "day" : period === "yesterday" ? "day" : "month"
  });

  const { data: revenueData } = useRevenueStatistics({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    period: period === "today" ? "day" : period === "yesterday" ? "day" : "month"
  });

  const state = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data || null,
    error: queryError ? queryError.message : "",
  }

  const [exportState, setExportState] = useState("");
  const doExport = useExportOrders();

  const orders = extractCollection(state.data);
  const totalCount = pickNumber(asRecord(state.data), ["total", "count", "totalCount"]) ?? 0;
  
  const metrics = asRecord(extractApiData(metricsData));
  const revStats = asRecord(extractApiData(revenueData));

  // Stat calculations from metrics & statistics services
  const totalRevenue = pickNumber(revStats, ["totalRevenue", "total"]) ?? 
                      pickNumber(metrics.revenue, ["total", "value"]) ?? 
                      (typeof metrics.revenue === 'number' ? metrics.revenue : 0);
                      
  const totalOrdersCount = pickNumber(metrics.orders, ["total", "count"]) ?? 
                          (typeof metrics.orders === 'number' ? metrics.orders : totalCount);
                          
  const totalDeposit = pickNumber(metrics.deposit, ["total", "value"]) ?? 
                      pickNumber(revStats, ["totalDeposit"]) ?? 0;

  const selectedOrder =
    orders.find(
      (order) =>
        pickString(order, ["id", "_id", "orderCode"]) === selectedOrderId,
    ) ?? null;

  async function handleExport() {
    const result = await doExport({
      startDate: dateRange.startDate || "",
      endDate: dateRange.endDate || ""
    });
    setExportState(result.ok ? result.filename : "Export failed");
  }

  React.useEffect(() => {
    setHeader({
      title: "Quản lý đơn hàng",
      subtitle: `Bạn đang có ${totalOrdersCount} đơn hàng ${period === 'today' ? 'hôm nay' : period === 'yesterday' ? 'hôm qua' : 'trong hệ thống'}`,
      showDateRange: false,
      actions: [
        {
          id: "export",
          label: "Xuất file Excel",
          icon: <Truck className="w-4 h-4" />,
          variant: "primary",
          onClick: handleExport,
          className: "bg-[#28c840] hover:bg-[#23af37] border-none font-bold"
        }
      ]
    });
  }, [totalOrdersCount, period, dateRange, setHeader]);

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = orders.map((o: Record<string, unknown>) => pickString(o, ["id", "_id", "orderCode"])).filter(Boolean);
      setSelectedBatchIds(new Set(allIds as string[]));
    } else {
      setSelectedBatchIds(new Set());
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchPrint = async () => {
    if (selectedBatchIds.size === 0 || isPrinting) return;
    const ordersToPrint = orders.filter((o: Record<string, unknown>) => {
      const id = pickString(o, ["id", "_id", "orderCode"]);
      return id && selectedBatchIds.has(id);
    });

    if (ordersToPrint.length === 0) return;

    setIsPrinting(true);
    setPrintProgress({ current: 0, total: ordersToPrint.length });

    try {
      const settings = await getPrintSettings("order");
      const shopInfo = { name: "MINI SHOP", address: "", phone: "" };
      const { createRoot } = await import("react-dom/client");

      for (let i = 0; i < ordersToPrint.length; i++) {
        setPrintProgress({ current: i + 1, total: ordersToPrint.length });

        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        document.body.appendChild(container);

        const root = createRoot(container);
        await new Promise<void>(resolve => {
          root.render(<OrderReceipt order={ordersToPrint[i]} settings={settings} shopInfo={shopInfo} />);
          setTimeout(resolve, 150);
        });

        const receiptEl = container.querySelector(".receipt") as HTMLElement;
        if (receiptEl) {
          printReceiptHtml(receiptEl);
        }

        setTimeout(() => {
          root.unmount();
          if (container.parentNode) document.body.removeChild(container);
        }, 2000);

        await new Promise(r => setTimeout(r, 600));
      }
    } catch (e) {
      console.error("Batch print error:", e);
    } finally {
      setIsPrinting(false);
      setPrintProgress(null);
      setSelectedBatchIds(new Set());
    }
  };

  const handlePrintSingle = async (order: Record<string, unknown>) => {
    if (isPrinting) return;
    setIsPrinting(true);
    try {
      const settings = await getPrintSettings("order");
      const shopInfo = { name: "MINI SHOP", address: "", phone: "" };
      const { createRoot } = await import("react-dom/client");

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      document.body.appendChild(container);

      const root = createRoot(container);
      await new Promise<void>(resolve => {
        root.render(<OrderReceipt order={order} settings={settings} shopInfo={shopInfo} />);
        setTimeout(resolve, 150);
      });

      const receiptEl = container.querySelector(".receipt") as HTMLElement;
      if (receiptEl) {
        printReceiptHtml(receiptEl);
      }

      setTimeout(() => {
        root.unmount();
        if (container.parentNode) document.body.removeChild(container);
      }, 2000);
    } catch (e) {
      console.error("Print error:", e);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-8 pb-28 lg:pb-6">

      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          label="Đơn cần xử lý"
          value={totalOrdersCount}
          icon={<ShoppingBag className="w-5 h-5" />}
          iconBg="bg-orange-50 dark:bg-orange-900/20"
          iconColor="text-orange-600 dark:text-orange-400"
        />
        <StatCard
          label="Tổng doanh thu"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign className="w-5 h-5" />}
          iconBg="bg-green-50 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatCard
          label="Tổng tiền cọc"
          value={formatCurrency(totalDeposit)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          iconColor="text-blue-600 dark:text-blue-400"
        />
      </div>

      <Panel title="Danh sách Đơn hàng" className="overflow-hidden relative">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-[var(--surface-subdued)] p-4 rounded-2xl border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row flex-1 w-full max-w-4xl items-center gap-4">
            <div className="flex bg-[var(--surface-strong)] rounded-xl p-1 border border-[var(--border)] shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button
                onClick={() => setPeriod("today")}
                className={`flex-1 sm:flex-none whitespace-nowrap rounded-lg px-5 py-2.5 text-xs font-bold transition-all ${period === "today" ? "bg-[#1447E6] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]"}`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setPeriod("yesterday")}
                className={`flex-1 sm:flex-none whitespace-nowrap rounded-lg px-5 py-2.5 text-xs font-bold transition-all ${period === "yesterday" ? "bg-[#1447E6] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]"}`}
              >
                Hôm qua
              </button>
              <button
                onClick={() => setPeriod("recent")}
                className={`flex-1 sm:flex-none whitespace-nowrap rounded-lg px-5 py-2.5 text-xs font-bold transition-all ${period === "recent" ? "bg-[#1447E6] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)]"}`}
              >
                Tất cả
              </button>
            </div>

            <div className="relative flex-1 group w-full">
              <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[#1447E6] transition-colors" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm mã đơn, tên khách hoặc SĐT..."
                className={`${CONTROL_CLASS} w-full pl-10 h-11 text-sm rounded-xl border-2 focus:border-[#1447E6] focus:ring-0 transition-all`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedBatchIds.size > 0 && (
              <button
                type="button"
                onClick={handleBatchPrint}
                disabled={isPrinting}
                className="h-11 px-6 rounded-xl bg-[#28c840] text-white hover:bg-[#23af37] font-bold text-sm flex items-center gap-2 shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                In {selectedBatchIds.size} đơn
              </button>
            )}
          </div>
        </div>

        {exportState ? (
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted)]">
            {exportState}
          </div>
        ) : null}

        {state.status === "loading" ? <LoadingState /> : null}
        {state.status === "error" ? <ErrorState message={state.error} /> : null}
        {state.status === "ready" && orders.length === 0 ? (
          <EmptyState message="Không có đơn hàng phù hợp." />
        ) : null}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden relative shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[var(--surface-muted)] text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-4 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[var(--border)] text-[#1447E6] focus:ring-[#1447E6]"
                      checked={orders.length > 0 && selectedBatchIds.size === orders.length}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="px-5 py-4 font-bold uppercase tracking-wider">Mã đơn hàng</th>
                  <th className="px-5 py-4 font-bold uppercase tracking-wider">Khách hàng</th>
                  <th className="px-5 py-4 font-bold uppercase tracking-wider">Số điện thoại</th>
                  <th className="px-5 py-4 font-bold uppercase tracking-wider text-right">Tổng thanh toán</th>
                  <th className="px-5 py-4 font-bold uppercase tracking-wider text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((order, index) => {
                  const id = pickString(order, ["id", "_id", "orderCode"]) || "";
                  const isActive = selectedOrderId === id;
                  const isChecked = selectedBatchIds.has(id);
                  const customerInfo = asRecord(order.customerId);
                  const name = pickString(customerInfo, ["igName", "fullName", "fbName"]) || pickString(order, ["igName", "customerName"]) || "Khách hàng";
                  return (
                    <tr
                      key={`${id || index}`}
                      onClick={() => setSelectedOrderId(id)}
                      className={`cursor-pointer group transition-all hover:bg-[var(--hover)] ${isActive ? "bg-[#1447E6]/5" : ""}`}
                    >
                      <td className="px-5 py-4 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-[var(--border)] text-[#1447E6] focus:ring-[#1447E6]"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(id)}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-[#1447E6] bg-[#1447E6]/10 px-2 py-1 rounded-md">
                          #{pickString(order, ["orderCode", "code"]) || id?.substring(0, 8)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#1447E6]/10 flex items-center justify-center border border-[#1447E6]/20 shadow-sm">
                            <span className="text-[#1447E6] font-bold text-sm">{name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-bold text-[var(--foreground)] text-sm group-hover:text-[#1447E6] transition-colors">{name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-[var(--muted)] font-semibold flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        {pickString(order, ["phone"]) || "—"}
                      </td>
                      <td className="px-5 py-4 font-black text-right text-[var(--foreground)] text-sm">
                        {formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800/30">
                          <span className="flex h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                          Chờ xử lý
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[var(--border)] bg-[var(--surface-subdued)]/30 px-6 py-4 gap-4">
            <div className="text-xs font-semibold text-[var(--muted)] flex items-center gap-2">
                <span className="flex items-center gap-1">
                  Đang xem <span className="text-[var(--foreground)] font-black">{orders.length}</span>
                </span>
                <span className="text-[var(--border)]">|</span>
                <span className="flex items-center gap-1">
                  Tổng cộng <span className="text-[var(--foreground)] font-black">{totalCount || orders.length}</span> đơn hàng
                </span>
            </div>
            
            <div className="flex items-center gap-3">
                <button
                    onClick={() => {
                      setPage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === 1}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[#1447E6] hover:border-[#1447E6] hover:shadow-md transition-all disabled:opacity-30 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center bg-[var(--surface-strong)] p-1 rounded-xl border border-[var(--border)]">
                     <span className="flex h-8 min-w-[32px] px-2 items-center justify-center rounded-lg bg-[#1447E6] text-white text-xs font-black shadow-sm">
                        {page}
                     </span>
                     {totalCount > 0 && Math.ceil(totalCount / 20) > 1 && (
                       <span className="text-[var(--muted)] text-[10px] font-bold px-3">
                          trên {Math.ceil(totalCount / 20)}
                       </span>
                     )}
                </div>

                <button
                    onClick={() => {
                      setPage(p => p + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={orders.length < 20 || (totalCount > 0 && page >= Math.ceil(totalCount / 20))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[#1447E6] hover:border-[#1447E6] hover:shadow-md transition-all disabled:opacity-30 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--muted)]"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
          </div>

        </div>
      </Panel>

      {selectedOrderId && selectedOrder && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in">
          <div 
            className="absolute inset-0 z-0" 
            onClick={() => setSelectedOrderId("")}
          />
          <div className="relative z-10 flex w-full max-w-2xl max-h-[90vh] flex-col bg-[var(--surface)] shadow-2xl rounded-[2.5rem] border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between border-b border-[var(--border)] p-6 shrink-0 bg-[var(--surface-subdued)]">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#1447E6] to-[#0E3BBF] flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xl font-black text-[var(--foreground)] flex items-center gap-2">
                        Chi tiết đơn hàng
                      </h4>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs bg-[#1447E6]/10 text-[#1447E6] px-2.5 py-1 rounded-lg font-bold uppercase tracking-tight">
                          #{pickString(selectedOrder, ["orderCode", "code"]) || "Order"}
                        </span>
                        <span className="text-xs text-[var(--muted)] font-bold uppercase tracking-wider">• {formatDateTime(pickString(selectedOrder, ["createdAt", "updatedAt"]))}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrderId("")}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-strong)] text-[var(--muted)] hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 transition-all active:scale-90 shadow-sm border border-[var(--border)]"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)] mb-1">Số tiền cần thu</p>
                      <h3 className="text-xl font-black text-[#1447E6]">
                        {formatCurrency(pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0)}
                      </h3>
                    </div>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)] mb-1">Tiền cọc</p>
                      <h3 className="text-xl font-black text-[#16a34a]">
                        {formatCurrency(pickNumber(selectedOrder, ["deposit"]) ?? 0)}
                      </h3>
                    </div>
                  </div>

                  {/* Customer Info Section Group */}
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 px-1">
                       <User className="w-3.5 h-3.5" /> Thông tin khách hàng
                    </h5>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)] shadow-sm">
                      <div className="p-4 flex justify-between items-center">
                        <span className="text-xs font-bold text-[var(--muted)]">Tên khách</span>
                        <span className="text-xs font-black text-[var(--foreground)]">{pickString(asRecord(selectedOrder.customerId), ["igName", "fullName", "fbName"]) || pickString(selectedOrder, ["igName", "customerName"]) || "Khách hàng"}</span>
                      </div>
                      <div className="p-4 flex justify-between items-center">
                        <span className="text-xs font-bold text-[var(--muted)]">Điện thoại</span>
                        <span className="text-xs font-black text-[#1447E6]">{pickString(selectedOrder, ["phone"]) || "Chưa cập nhật"}</span>
                      </div>
                      <div className="p-4">
                        <span className="text-xs font-bold text-[var(--muted)] block mb-1">Địa chỉ giao hàng</span>
                        <span className="text-xs font-bold text-[var(--foreground)] leading-relaxed">{compactAddress(asRecord(selectedOrder.shippingAddress || selectedOrder)) || "Chưa cập nhật địa chỉ"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items Section */}
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 px-1">
                       <ShoppingBag className="w-3.5 h-3.5" /> Sản phẩm trong đơn ({extractCollection(selectedOrder.items).length})
                    </h5>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[var(--surface-muted)] text-[var(--muted)] border-b border-[var(--border)]">
                          <tr>
                            <th className="px-4 py-3 font-bold uppercase tracking-wider">Mặt hàng</th>
                            <th className="px-4 py-3 font-bold uppercase tracking-wider text-center">SL</th>
                            <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Giá</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {extractCollection(selectedOrder.items).length > 0 ? (
                            extractCollection(selectedOrder.items).map((item, idx) => (
                              <tr key={idx} className="hover:bg-[var(--hover)] transition-colors">
                                <td className="px-4 py-3">
                                  <p className="font-bold text-[var(--foreground)]">{pickString(item, ["productName", "name", "title"]) || "Sản phẩm không tên"}</p>
                                  <p className="text-[10px] text-[var(--muted)]">#{pickString(item, ["sku", "code"]) || "NO-SKU"}</p>
                                </td>
                                <td className="px-4 py-3 text-center font-black">{pickNumber(item, ["quantity", "count"]) || 1}</td>
                                <td className="px-4 py-3 text-right font-bold text-[var(--foreground)]">{formatCurrency(pickNumber(item, ["price"]) ?? 0)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-[var(--muted)] italic">Không tìm thấy thông tin sản phẩm chi tiết</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-[var(--surface-subdued)]/50 font-black border-t border-[var(--border)]">
                          <tr>
                            <td colSpan={2} className="px-4 py-3 text-right text-[var(--muted)] uppercase tracking-wider">Tổng cộng</td>
                            <td className="px-4 py-3 text-right text-[#1447E6]">{formatCurrency(pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-4 pb-6">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-2 px-1">
                       <Truck className="w-3.5 h-3.5" /> Ghi chú & Vận chuyển
                    </h5>
                    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 space-y-3 shadow-sm">
                       <div>
                         <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider mb-1">Ghi chú đơn hàng</p>
                         <p className="text-xs font-semibold text-[var(--foreground)] italic">
                            {pickString(selectedOrder, ["note", "customerNote"]) || "Không có ghi chú nào cho đơn hàng này."}
                         </p>
                       </div>
                       <div className="pt-3 border-t border-[var(--border)]/50">
                         <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider mb-1">Trạng thái vận chuyển</p>
                         <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                           <span className="text-xs font-black text-orange-600 uppercase tracking-tight">Đang chờ chuẩn bị hàng</span>
                         </div>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-subdued)] shrink-0 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsDeliveryModalOpen(true)}
                    className="h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-xs font-black text-white shadow-lg shadow-orange-500/10 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
                  >
                    <Truck className="w-4 h-4" />
                    GIAO HÀNG
                  </button>
                  <button
                    onClick={() => handlePrintSingle(selectedOrder)}
                    disabled={isPrinting}
                    className="h-14 rounded-2xl bg-[#28c840] hover:bg-[#23af37] text-xs font-black text-white shadow-lg shadow-green-500/10 transition-all flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50"
                  >
                    <Printer className="w-4 h-4" />
                    {isPrinting ? "ĐANG IN..." : "IN VẬN ĐƠN"}
                  </button>
                </div>
          </div>
        </div>,
        document.body
      )}

      {selectedOrderId && selectedOrder && (
        <DeliveryModal 
          isOpen={isDeliveryModalOpen}
          onClose={() => setIsDeliveryModalOpen(false)}
          order={selectedOrder}
        />
      )}

      {printProgress && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-8 w-80 shadow-2xl flex flex-col items-center">
            <svg className="h-10 w-10 text-[#1447E6] animate-spin mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Đang in đơn hàng</h3>
            <p className="text-sm font-medium text-gray-500 mb-4">
              Đơn thứ {printProgress.current} trong số {printProgress.total} đơn
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-[#1447E6] h-2.5 rounded-full transition-all duration-300" style={{ width: `${(printProgress.current / printProgress.total) * 100}%` }}></div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
