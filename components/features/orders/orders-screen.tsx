"use client";

import React, { useState, useDeferredValue } from "react";
import { createPortal } from "react-dom";
import { useOrders, useExportOrders } from "@/hooks/use-orders";
import { useMetrics } from "@/hooks/use-metrics";
import { useHeaderStore } from "@/lib/store/header-store";
import { useSettingsStore } from "@/stores/settings-store";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import { asRecord, extractApiData, extractCollection, pickString, pickNumber, formatCurrency, formatDateTime } from "@/lib/proxy-client";
import { printReceiptHtml, printReceipt } from "@/lib/printUtils";
import { OrderReceipt } from "@/components/print/OrderReceipt";
import { BridgeSetupModal } from "@/components/print/BridgeSetupModal";
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
import { OrderStatusBadge } from "./order-status-badge";
import { OrderDetailModal } from "./order-detail-modal";
import { ORDER_STATUS_OPTIONS, getOrderStatusLabel } from "@/lib/utils/order-status";

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

function Toast({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-lg text-xs font-medium shadow-lg ${type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
      {message}
    </div>
  );
}

export function OrdersScreen() {
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [isPrinting, setIsPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState<{ current: number; total: number } | null>(null);
  const { getPrintSettings } = usePrintSettings();
  const setHeader = useHeaderStore((state) => state.setHeader);
  const [page, setPage] = useState(1);

  // Local Bridge offline modal state
  const [isBridgeOfflineOpen, setIsBridgeOfflineOpen] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = React.useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const [period, setPeriod] = useState<"today" | "yesterday" | "recent" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Reset page when filter changes
  React.useEffect(() => {
    setPage(1);
  }, [search, period, customStartDate, customEndDate, statusFilter]);

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
    if (period === "custom") {
      const isValidDate = (d: string) => d && !Number.isNaN(new Date(d).getTime());
      return {
        startDate: isValidDate(customStartDate) ? new Date(customStartDate).toISOString() : undefined,
        endDate: isValidDate(customEndDate) ? new Date(customEndDate).toISOString() : undefined
      };
    }
    return { startDate: undefined, endDate: undefined };
  }, [period, customStartDate, customEndDate]);

  const { data, status, error: queryError } = useOrders({ 
    page, 
    search, 
    startDate: dateRange.startDate || undefined, 
    endDate: dateRange.endDate || undefined,
  });

  const state = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data || null,
    error: queryError ? queryError.message : "",
  }

  const [exportState, setExportState] = useState("");
  const doExport = useExportOrders();

  let orders = extractCollection(state.data);
  if (statusFilter) {
    orders = orders.filter((o: any) => o.status === statusFilter);
  }


  const ordersData = asRecord(extractApiData(state.data));
  const totalRevenue = pickNumber(ordersData, ["totalRevenue"]) ?? 0;
  const totalDeposit = pickNumber(ordersData, ["totalDeposit"]) ?? 0;
  const totalCount = pickNumber(asRecord(ordersData.pagination), ["total"]) ?? pickNumber(ordersData, ["total", "count", "totalCount"]) ?? 0;
  const totalOrdersCount = totalCount;

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
          icon: <FileDown className="w-4 h-4" />,
          variant: "primary",
          onClick: handleExport,
          className: "bg-emerald-600 hover:bg-emerald-700 text-white font-bold border-none"
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
          const result = await printReceipt(receiptEl);
          if (!result.success) {
            if (result.isOffline) {
              setIsBridgeOfflineOpen(true);
              showToast("⚠️ KHÔNG TÌM THẤY LOCAL BRIDGE! Dừng in hàng loạt.", "error");
            } else {
              showToast(`⚠️ Lỗi in đơn #${i + 1}: ${result.error}`, "error");
            }
            root.unmount();
            if (container.parentNode) document.body.removeChild(container);
            break;
          }
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
        const result = await printReceipt(receiptEl);
        if (!result.success) {
          if (result.isOffline) {
            setIsBridgeOfflineOpen(true);
            showToast("⚠️ KHÔNG TÌM THẤY LOCAL BRIDGE! Vui lòng khởi động ứng dụng hoặc cài đặt phần mềm máy in.", "error");
          } else {
            showToast(`⚠️ Lỗi máy in: ${result.error}`, "error");
          }
        } else {
          showToast("Đã gửi lệnh in thành công qua Local Bridge.", "success");
        }
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
    <div className="space-y-4 pb-28 lg:pb-6 pt-0">

      <div className="grid gap-3.5 md:grid-cols-3">
        <StatCard
          label="Đơn cần xử lý"
          value={totalOrdersCount}
          icon={<ShoppingBag className="w-4 h-4" />}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <StatCard
          label="Tổng doanh thu"
          value={formatCurrency(totalRevenue)}
          icon={<DollarSign className="w-4 h-4" />}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Tổng tiền cọc"
          value={formatCurrency(totalDeposit)}
          icon={<ClipboardCheck className="w-4 h-4" />}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
      </div>

      <Panel title="Danh sách Đơn hàng" className="overflow-hidden relative">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap flex-1 w-full lg:max-w-5xl items-stretch md:items-center gap-3">
            {/* Ô Search (Bên trái) */}
            <div className="relative flex-1 md:min-w-[280px] lg:min-w-[320px] group w-full">
              <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[var(--primary)] transition-colors" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm mã đơn, tên khách hoặc SĐT..."
                className={`${CONTROL_CLASS} w-full pl-10 h-9 text-sm rounded-lg`}
              />
            </div>

            {/* Khối bộ lọc nhanh và khoảng thời gian (Bên phải) */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
              <div className="flex bg-[var(--surface)] rounded-lg p-0.5 border border-[var(--border)] shrink-0 overflow-x-auto no-scrollbar w-full sm:w-auto">
                <button
                  onClick={() => setPeriod("today")}
                  className={`flex-1 sm:flex-none whitespace-nowrap rounded-md px-4 py-2 text-xs font-medium transition-all ${period === "today" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >
                  Hôm nay
                </button>
                <button
                  onClick={() => setPeriod("yesterday")}
                  className={`flex-1 sm:flex-none whitespace-nowrap rounded-md px-4 py-2 text-xs font-medium transition-all ${period === "yesterday" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >
                  Hôm qua
                </button>
                <button
                  onClick={() => setPeriod("recent")}
                  className={`flex-1 sm:flex-none whitespace-nowrap rounded-md px-4 py-2 text-xs font-medium transition-all ${period === "recent" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setPeriod("custom")}
                  className={`flex-1 sm:flex-none whitespace-nowrap rounded-md px-4 py-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${period === "custom" ? "bg-[var(--primary)] text-white shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Khoảng ngày
                </button>
              </div>

              {/* Ô chọn ngày khi lọc tùy chọn */}
              {period === "custom" && (
                <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 duration-200 shrink-0 w-full sm:w-auto justify-between sm:justify-start">
                  <input
                    type="datetime-local"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)] w-[46%] sm:w-44"
                  />
                  <span className="text-[var(--muted)] text-[10px] font-bold uppercase tracking-wider shrink-0">đến</span>
                  <input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)] w-[46%] sm:w-44"
                  />
                </div>
              )}

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--primary)]"
              >
                <option value="">Tất cả trạng thái</option>
                {ORDER_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getOrderStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {selectedBatchIds.size > 0 && (
              <button
                type="button"
                onClick={handleBatchPrint}
                disabled={isPrinting}
                className="h-9 px-4 rounded-lg bg-[var(--accent-green)] text-white hover:bg-[var(--accent-green-strong)] font-medium text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                In {selectedBatchIds.size} đơn
              </button>
            )}
          </div>
        </div>

        {exportState ? (
          <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--muted)]">
            {exportState}
          </div>
        ) : null}

        {state.status === "loading" ? <LoadingState /> : null}
        {state.status === "error" ? <ErrorState message={state.error} /> : null}
        {state.status === "ready" && orders.length === 0 ? (
          <EmptyState message="Không có đơn hàng phù hợp." />
        ) : null}

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[var(--surface-muted)] text-[var(--muted)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-4 py-2.5 w-12 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      checked={orders.length > 0 && selectedBatchIds.size === orders.length}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-[11px]">Mã đơn hàng</th>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-[11px]">Khách hàng</th>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-[11px]">Số điện thoại</th>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-right text-[11px]">Tổng thanh toán</th>
                  <th className="px-4 py-2.5 font-medium uppercase tracking-wider text-center text-[11px]">Trạng thái</th>
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
                      className={`cursor-pointer group transition-colors hover:bg-[var(--hover)] ${isActive ? "bg-blue-50 dark:bg-blue-900/10" : ""}`}
                    >
                      <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(id)}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs font-medium text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 rounded">
                          #{pickString(order, ["orderCode", "code"]) || id?.substring(0, 8)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-[var(--border)] bg-[color:var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 text-xs relative">
                            {pickString(customerInfo, ["avatar"]) ? (
                              <>
                                <img 
                                  src={pickString(customerInfo, ["avatar"])!} 
                                  alt={name} 
                                  className="h-full w-full object-cover" 
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                                  }} 
                                />
                                <div className="absolute inset-0 items-center justify-center bg-[color:var(--primary-soft)] text-[var(--primary)] font-bold hidden [.fallback-active_&]:flex uppercase">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                              </>
                            ) : (
                              <span className="font-bold uppercase">
                                {name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-[var(--foreground)] text-sm group-hover:text-[var(--primary)] transition-colors">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 text-[var(--muted)] font-medium text-xs">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{pickString(order, ["phone"]) || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-right text-[var(--foreground)] text-sm">
                        {formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <OrderStatusBadge status={pickString(order, ["status"])} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-[var(--border)] px-4 py-3 gap-3">
            <div className="text-xs font-medium text-[var(--muted)] flex items-center gap-2">
                <span className="flex items-center gap-1">
                  Đang xem <span className="text-[var(--foreground)] font-semibold">{orders.length}</span>
                </span>
                <span className="text-[var(--border)]">|</span>
                <span className="flex items-center gap-1">
                  Tổng cộng <span className="text-[var(--foreground)] font-semibold">{totalCount || orders.length}</span> đơn hàng
                </span>
            </div>
            
            <div className="flex items-center gap-3">
                <button
                    onClick={() => {
                      setPage(p => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center bg-[var(--surface)] p-0.5 rounded border border-[var(--border)]">
                     <span className="flex h-7 min-w-[28px] px-2 items-center justify-center rounded bg-[var(--primary)] text-white text-xs font-normal">
                        {page}
                     </span>
                     {totalCount > 0 && Math.ceil(totalCount / 20) > 1 && (
                       <span className="text-[var(--muted)] text-[10px] font-normal px-2">
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
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
          </div>

        </div>
      </Panel>

      {selectedOrderId && selectedOrder && typeof document !== "undefined" && createPortal(
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrderId("")}
          onOpenDelivery={() => setIsDeliveryModalOpen(true)}
          onPrint={() => handlePrintSingle(selectedOrder)}
          isPrinting={isPrinting}
        />,
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
            <svg className="h-10 w-10 text-[var(--primary)] animate-spin mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Đang in đơn hàng</h3>
            <p className="text-sm font-medium text-gray-500 mb-4">
              Đơn thứ {printProgress.current} trong số {printProgress.total} đơn
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-[var(--primary)] h-2.5 rounded-full transition-all duration-300" style={{ width: `${(printProgress.current / printProgress.total) * 100}%` }}></div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Local Bridge Setup & Offline Modal */}
      <BridgeSetupModal
        isOpen={isBridgeOfflineOpen}
        onClose={() => setIsBridgeOfflineOpen(false)}
        onRetry={async () => {
          setIsBridgeOfflineOpen(false);
          showToast("Đang kiểm tra kết nối với Local Bridge...", "success");
        }}
      />

      {toast && typeof document !== "undefined" && createPortal(<Toast message={toast.message} type={toast.type} />, document.body)}
    </div>
  );
}
