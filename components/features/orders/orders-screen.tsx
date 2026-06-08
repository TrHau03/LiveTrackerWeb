"use client";

import React, { useState, useDeferredValue, useRef, useEffect } from "react";
import { createPortal, flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { useOrders, useExportOrders } from "@/hooks/use-orders";
import { useMetrics } from "@/hooks/use-metrics";
import { useHeaderStore } from "@/stores/header-store";
import { useSettingsStore } from "@/stores/settings-store";
import { usePrintSettings } from "@/hooks/use-print-settings";
import { useTags } from "@/hooks/use-tags";
import { asRecord, extractApiData, extractCollection, pickString, pickNumber, formatCurrency, formatDateTime } from "@/lib/proxy-client";
import { printReceiptHtml, printReceipt } from "@/lib/utils/print-utils";
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
import { OrdersDateRangePicker } from "@/components/orders-date-range-picker";
import { Dropdown } from "@/components/ui/dropdown";

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
  Check,
  ExternalLink,
  ChevronUp,
  ChevronDown,
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
  const resetHeader = useHeaderStore((state) => state.resetHeader);
  const [page, setPage] = useState(1);
  const isRestoredRef = React.useRef(false);

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

  const [period, setPeriod] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const autoOrderId = sessionStorage.getItem("auto_select_order_id");
      if (autoOrderId) {
        return "recent";
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("orderId")) {
        return "recent";
      }
    }
    return "today";
  });
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  // Advanced filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [hasDepositFilter, setHasDepositFilter] = useState<boolean | undefined>(undefined);
  const [walkInCustomerFilter, setWalkInCustomerFilter] = useState<boolean | undefined>(undefined);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const { data: tagsData = [] } = useTags();
  const tags = extractCollection(tagsData);

  const statusOptions = React.useMemo(() => {
    return ORDER_STATUS_OPTIONS.map((status) => ({
      value: status,
      label: getOrderStatusLabel(status),
    }));
  }, []);

  // Reset page when filter changes
  React.useEffect(() => {
    if (isRestoredRef.current) {
      setPage(1);
    }
  }, [
    search, period, customStartDate, customEndDate, statusFilter,
    hasDepositFilter, walkInCustomerFilter, selectedTagId, orderPhone,
    orderAddress, sortBy, sortOrder
  ]);

  // Khôi phục bộ lọc từ sessionStorage khi mount (chỉ chạy ở client)
  React.useEffect(() => {
    const saved = sessionStorage.getItem("orders_filters");
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        isRestoredRef.current = false;

        if (filters.query !== undefined) setQuery(filters.query);
        if (filters.period !== undefined) setPeriod(filters.period);
        if (filters.customStartDate !== undefined) setCustomStartDate(filters.customStartDate);
        if (filters.customEndDate !== undefined) setCustomEndDate(filters.customEndDate);
        if (filters.statusFilter !== undefined) setStatusFilter(filters.statusFilter);
        if (filters.hasDepositFilter !== undefined) setHasDepositFilter(filters.hasDepositFilter);
        if (filters.walkInCustomerFilter !== undefined) setWalkInCustomerFilter(filters.walkInCustomerFilter);
        if (filters.selectedTagId !== undefined) setSelectedTagId(filters.selectedTagId);
        if (filters.orderPhone !== undefined) setOrderPhone(filters.orderPhone);
        if (filters.sortBy !== undefined) setSortBy(filters.sortBy);
        if (filters.sortOrder !== undefined) setSortOrder(filters.sortOrder);
        if (filters.showAdvancedFilters !== undefined) setShowAdvancedFilters(filters.showAdvancedFilters);

        // Khôi phục page sau cùng bằng setTimeout để tránh bị reset page
        if (filters.page !== undefined) {
          setTimeout(() => {
            setPage(filters.page);
            isRestoredRef.current = true;
          }, 0);
        } else {
          isRestoredRef.current = true;
        }
      } catch (e) {
        console.error("Error restoring filters", e);
        isRestoredRef.current = true;
      }
    } else {
      isRestoredRef.current = true;
    }
  }, []);

  // Lưu bộ lọc vào sessionStorage khi có thay đổi
  React.useEffect(() => {
    if (isRestoredRef.current) {
      const filters = {
        query,
        period,
        customStartDate,
        customEndDate,
        statusFilter,
        page,
        showAdvancedFilters,
        hasDepositFilter,
        walkInCustomerFilter,
        selectedTagId,
        orderPhone,
        sortBy,
        sortOrder
      };
      sessionStorage.setItem("orders_filters", JSON.stringify(filters));
    }
  }, [
    query, period, customStartDate, customEndDate, statusFilter, page,
    showAdvancedFilters, hasDepositFilter, walkInCustomerFilter, selectedTagId,
    orderPhone, sortBy, sortOrder
  ]);

  // Auto-select order if orderId is in URL query parameters or sessionStorage
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const autoOrderId = sessionStorage.getItem("auto_select_order_id");
      if (autoOrderId) {
        setSelectedOrderId(autoOrderId);
        setPeriod("recent");
        sessionStorage.removeItem("auto_select_order_id");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const orderId = params.get("orderId");
      if (orderId) {
        setSelectedOrderId(orderId);
        setPeriod("recent");

        // Remove orderId from URL parameters to keep the URL clean
        params.delete("orderId");
        const newSearch = params.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, "", newUrl);
      }
    }
  }, []);

  const dateRange = React.useMemo(() => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (period) {
      case "today":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case "yesterday":
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(now.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case "7days":
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case "30days":
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: start.toISOString(), endDate: end.toISOString() };
      case "thisMonth":
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        firstDay.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: firstDay.toISOString(), endDate: end.toISOString() };
      case "lastMonth":
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        firstDayLastMonth.setHours(0, 0, 0, 0);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        lastDayLastMonth.setHours(23, 59, 59, 999);
        return { startDate: firstDayLastMonth.toISOString(), endDate: lastDayLastMonth.toISOString() };
      case "custom":
        const isValidDate = (d: string) => d && !Number.isNaN(new Date(d).getTime());
        return {
          startDate: isValidDate(customStartDate) ? new Date(customStartDate).toISOString() : undefined,
          endDate: isValidDate(customEndDate) ? new Date(customEndDate).toISOString() : undefined
        };
      case "recent":
      default:
        return { startDate: undefined, endDate: undefined };
    }
  }, [period, customStartDate, customEndDate]);

  const { data, status, error: queryError } = useOrders({ 
    page, 
    search, 
    startDate: dateRange.startDate || undefined, 
    endDate: dateRange.endDate || undefined,
    hasDeposit: hasDepositFilter,
    phone: orderPhone.trim() || undefined,
    walkInCustomer: walkInCustomerFilter,
    tagId: selectedTagId || undefined,
    sortBy,
    sortOrder
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

  const activeFilters = React.useMemo(() => {
    const pills = [];
    if (period !== "recent") {
      const getPeriodLabel = () => {
        switch (period) {
          case "today": return "Hôm nay";
          case "yesterday": return "Hôm qua";
          case "7days": return "7 ngày qua";
          case "30days": return "30 ngày qua";
          case "thisMonth": return "Tháng này";
          case "lastMonth": return "Tháng trước";
          case "custom": return "Tùy chỉnh";
          default: return period;
        }
      };
      pills.push({
        id: "period",
        label: `Thời gian: ${getPeriodLabel()}`,
        onRemove: () => setPeriod("recent")
      });
    }
    if (statusFilter) {
      pills.push({
        id: "status",
        label: `Trạng thái: ${getOrderStatusLabel(statusFilter)}`,
        onRemove: () => setStatusFilter("")
      });
    }
    if (hasDepositFilter !== undefined) {
      pills.push({
        id: "deposit",
        label: `Cọc tiền: ${hasDepositFilter ? "Đã cọc" : "Chưa cọc"}`,
        onRemove: () => setHasDepositFilter(undefined)
      });
    }
    if (walkInCustomerFilter !== undefined) {
      pills.push({
        id: "walkIn",
        label: `Khách vãng lai: ${walkInCustomerFilter ? "Chỉ khách vãng lai" : "Không bao gồm"}`,
        onRemove: () => setWalkInCustomerFilter(undefined)
      });
    }
    if (selectedTagId) {
      const tag = tags.find((t: any) => t._id === selectedTagId);
      pills.push({
        id: "tag",
        label: `Nhãn: ${tag?.label || selectedTagId}`,
        onRemove: () => setSelectedTagId("")
      });
    }
    if (orderPhone) {
      pills.push({
        id: "phone",
        label: `SĐT: ${orderPhone}`,
        onRemove: () => setOrderPhone("")
      });
    }
    return pills;
  }, [period, statusFilter, hasDepositFilter, walkInCustomerFilter, selectedTagId, orderPhone, tags]);


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
          className: "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold border-none"
        }
      ]
    });
    return () => resetHeader();
  }, [totalOrdersCount, period, dateRange, setHeader, resetHeader]);

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

      for (let i = 0; i < ordersToPrint.length; i++) {
        setPrintProgress({ current: i + 1, total: ordersToPrint.length });

        const container = document.createElement("div");
        container.style.position = "absolute";
        container.style.left = "-9999px";
        document.body.appendChild(container);

        const root = createRoot(container);
        flushSync(() => {
          root.render(<OrderReceipt order={ordersToPrint[i]} settings={settings} shopInfo={shopInfo} />);
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

        root.unmount();
        if (container.parentNode) document.body.removeChild(container);

        if (i < ordersToPrint.length - 1) {
          await new Promise(r => setTimeout(r, 200));
        }
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

      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      document.body.appendChild(container);

      const root = createRoot(container);
      flushSync(() => {
        root.render(<OrderReceipt order={order} settings={settings} shopInfo={shopInfo} />);
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
      }, 300);
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

      <Panel title="Danh sách Đơn hàng" className="relative">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] shadow-sm">
          <div className="flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap flex-1 w-full lg:max-w-5xl items-stretch md:items-center gap-3">
            {/* Ô Search (Bên trái) */}
            <div className="relative flex-1 md:min-w-[280px] lg:min-w-[320px] group w-full">
              <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)] group-focus-within:text-[var(--primary)] transition-colors" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm mã đơn, tên khách hoặc SĐT..."
                className={`${CONTROL_CLASS} w-full pl-10 pr-10 h-10 text-sm rounded-xl border-[var(--border)] focus:border-[var(--primary)] focus:ring-[var(--primary)] focus:ring-2 transition-all shadow-sm`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--hover)] rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Khối bộ lọc nhanh và khoảng thời gian (Bên phải) */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
              <OrdersDateRangePicker
                period={period}
                startDate={customStartDate}
                endDate={customEndDate}
                onPeriodChange={(nextPeriod, nextStart, nextEnd) => {
                  setPeriod(nextPeriod);
                  if (nextStart !== undefined) setCustomStartDate(nextStart);
                  if (nextEnd !== undefined) setCustomEndDate(nextEnd);
                }}
              />

              {/* Status Select with Chevron Down */}
              <Dropdown
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions}
                placeholder="Tất cả trạng thái"
                minWidth="155px"
              />

              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`h-10 px-4 w-full sm:w-auto rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all select-none shadow-sm ${
                  showAdvancedFilters 
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]" 
                    : "bg-[var(--surface)] text-[var(--foreground-soft)] border-[var(--border)] hover:bg-[var(--hover)] hover:border-[var(--primary)]"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Bộ lọc nâng cao
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filter Panel */}
        <div 
          className={`mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-inner transition-all duration-300 origin-top overflow-hidden ${
            showAdvancedFilters
              ? "opacity-100 translate-y-0 max-h-[500px] p-4 border-t"
              : "opacity-0 translate-y-[-10px] max-h-0 p-0 border-t-0 pointer-events-none"
          }`}
        >
          {/* Lọc Trạng thái cọc */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Trạng thái cọc</label>
            <div className="relative">
              <select
                value={hasDepositFilter === undefined ? "" : String(hasDepositFilter)}
                onChange={(e) => {
                  const val = e.target.value;
                  setHasDepositFilter(val === "" ? undefined : val === "true");
                }}
                className={`${CONTROL_CLASS} w-full text-xs h-10 rounded-lg appearance-none pr-9 cursor-pointer hover:border-[var(--primary)] focus:border-[var(--primary)] transition-all shadow-sm`}
              >
                <option value="">Tất cả</option>
                <option value="true">Đã cọc tiền</option>
                <option value="false">Chưa cọc tiền</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Lọc Khách vãng lai */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Khách vãng lai</label>
            <div className="relative">
              <select
                value={walkInCustomerFilter === undefined ? "" : String(walkInCustomerFilter)}
                onChange={(e) => {
                  const val = e.target.value;
                  setWalkInCustomerFilter(val === "" ? undefined : val === "true");
                }}
                className={`${CONTROL_CLASS} w-full text-xs h-10 rounded-lg appearance-none pr-9 cursor-pointer hover:border-[var(--primary)] focus:border-[var(--primary)] transition-all shadow-sm`}
              >
                <option value="">Tất cả</option>
                <option value="true">Chỉ khách vãng lai</option>
                <option value="false">Không bao gồm khách vãng lai</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Lọc theo Nhãn (Tags) */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Lọc theo Nhãn (Tag)</label>
            <div className="relative">
              <select
                value={selectedTagId}
                onChange={(e) => setSelectedTagId(e.target.value)}
                className={`${CONTROL_CLASS} w-full text-xs h-10 rounded-lg appearance-none pr-9 cursor-pointer hover:border-[var(--primary)] focus:border-[var(--primary)] transition-all shadow-sm`}
              >
                <option value="">Tất cả nhãn</option>
                {tags.map((tag: any) => (
                  <option key={tag._id} value={tag._id}>
                    {tag.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Số điện thoại */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Số điện thoại</label>
            <input
              type="text"
              value={orderPhone}
              onChange={(e) => setOrderPhone(e.target.value)}
              placeholder="Nhập SĐT cần lọc..."
              className={`${CONTROL_CLASS} w-full text-xs h-10 rounded-lg hover:border-[var(--primary)] focus:border-[var(--primary)] transition-all shadow-sm`}
            />
          </div>

          {/* Sắp xếp cột */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Sắp xếp theo</label>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`${CONTROL_CLASS} w-full text-xs h-10 rounded-lg appearance-none pr-9 cursor-pointer hover:border-[var(--primary)] focus:border-[var(--primary)] transition-all shadow-sm`}
              >
                <option value="createdAt">Ngày tạo</option>
                <option value="totalPrice">Tổng thanh toán</option>
                <option value="quantity">Số lượng sản phẩm</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Thứ tự sắp xếp */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider block">Thứ tự</label>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
                className={`${CONTROL_CLASS} w-full text-xs h-10 rounded-lg appearance-none pr-9 cursor-pointer hover:border-[var(--primary)] focus:border-[var(--primary)] transition-all shadow-sm`}
              >
                <option value="desc">Giảm dần (Mới nhất / Lớn nhất)</option>
                <option value="asc">Tăng dần (Cũ nhất / Nhỏ nhất)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Nút reset nhanh bộ lọc */}
          <div className="sm:col-span-2 flex items-end justify-end gap-2.5">
            <button
              type="button"
              onClick={() => {
                setHasDepositFilter(undefined);
                setWalkInCustomerFilter(undefined);
                setSelectedTagId("");
                setOrderPhone("");
                setOrderAddress("");
                setSortBy("createdAt");
                setSortOrder("desc");
              }}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-600 hover:bg-red-100 active:scale-95 transition-all duration-150 shadow-sm"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Reset bộ lọc
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        {activeFilters.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 p-1.5 bg-[var(--surface-muted)] rounded-lg border border-[var(--border)] animate-in fade-in duration-200">
            <span className="text-[10px] font-bold text-[var(--muted)] uppercase tracking-wider mr-1 ml-1">Đang lọc theo:</span>
            {activeFilters.map(pill => (
              <span key={pill.id} className="inline-flex items-center gap-1 bg-[var(--primary-soft)] text-[var(--primary)] text-xs font-semibold px-2.5 py-1 rounded-full border border-[var(--primary-soft)] select-none">
                {pill.label}
                <button
                  onClick={pill.onRemove}
                  className="hover:bg-red-100 hover:text-red-500 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button
              onClick={() => {
                setPeriod("recent");
                setStatusFilter("");
                setHasDepositFilter(undefined);
                setWalkInCustomerFilter(undefined);
                setSelectedTagId("");
                setOrderPhone("");
              }}
              className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline ml-2"
            >
              Xóa tất cả
            </button>
          </div>
        )}

        {exportState ? (
          <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--muted)]">
            {exportState}
          </div>
        ) : null}

        {state.status === "loading" ? <LoadingState /> : null}
        {state.status === "error" ? <ErrorState message={state.error} /> : null}
        
        {/* Custom Empty State with Reset Button */}
        {state.status === "ready" && orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-8 text-[var(--muted)] text-center my-4">
            <span className="text-sm font-medium">Không tìm thấy đơn hàng phù hợp với điều kiện lọc.</span>
            <button
              onClick={() => {
                setQuery("");
                setPeriod("recent");
                setStatusFilter("");
                setHasDepositFilter(undefined);
                setWalkInCustomerFilter(undefined);
                setSelectedTagId("");
                setOrderPhone("");
              }}
              className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-xs font-semibold text-white shadow-sm hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              Reset tất cả bộ lọc
            </button>
          </div>
        ) : null}

        {state.status === "ready" && orders.length > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden relative">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-[var(--surface-muted)] text-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th className="px-4 py-3 w-12 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded-md border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] transition-all cursor-pointer"
                        checked={orders.length > 0 && selectedBatchIds.size === orders.length}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Mã đơn hàng</th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Khách hàng</th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wider text-[11px]">Số điện thoại</th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wider text-center text-[11px]">Số lượng</th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wider text-right text-[11px]">Tổng thanh toán</th>
                    <th className="px-4 py-3 font-medium uppercase tracking-wider text-center text-[11px]">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {orders.map((order, index) => {
                    const id = pickString(order, ["id", "_id", "orderCode"]) || "";
                    const isActive = selectedOrderId === id;
                    const isChecked = selectedBatchIds.has(id);
                    const customerInfo = asRecord(order.customerId);
                    const name = pickString(customerInfo, ["igName", "fullName", "fbName"]) || pickString(order, ["igName", "customerName"]) || "Khách hàng";
                    const avatar = pickString(customerInfo, ["avatar"]);
                    const quantity = pickNumber(order, ["quantity", "count"]) || 1;

                    return (
                      <tr
                        key={`${id || index}`}
                        onClick={() => setSelectedOrderId(id)}
                        className={`cursor-pointer group transition-all duration-200 hover:bg-[var(--hover)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] border-l-4 ${isActive ? "border-[var(--primary)] bg-blue-50/70 dark:bg-blue-900/10" : "border-transparent"}`}
                      >
                        <td className="px-4 py-3.5 text-center" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded-md border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] transition-all cursor-pointer"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(id)}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-semibold text-[var(--primary)] bg-[var(--primary-soft)] px-2.5 py-1 rounded-md transition-all group-hover:bg-[var(--primary)] group-hover:text-white">
                            #{pickString(order, ["orderCode", "code"]) || id?.substring(0, 8)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 overflow-hidden rounded-full ring-1 ring-[var(--border)] bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 relative">
                              {avatar ? (
                                <>
                                  <img 
                                    src={avatar} 
                                    alt={name} 
                                    className="h-full w-full object-cover" 
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                      (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                                    }} 
                                  />
                                  <div className="absolute inset-0 hidden items-center justify-center bg-[var(--primary-soft)] text-[var(--primary)] [.fallback-active_&]:flex">
                                    <User className="w-3.5 h-3.5" />
                                  </div>
                                </>
                              ) : (
                                <User className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <span className="font-semibold text-[var(--foreground)] text-sm group-hover:text-[var(--primary)] transition-colors">{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-[var(--muted)] font-medium text-xs">
                            <Phone className="w-3.5 h-3.5 shrink-0" />
                            <span>{pickString(order, ["phone"]) || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 bg-[var(--surface-muted)] text-[var(--foreground-soft)] font-semibold rounded-full text-[11px]">
                            {quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-right text-[var(--foreground)] text-sm">
                          {formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
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
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all disabled:opacity-30"
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
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all disabled:opacity-30"
                  >
                      <ChevronRight className="w-5 h-5" />
                  </button>
              </div>
            </div>

          </div>
        )}
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

      {selectedBatchIds.size > 0 && typeof document !== "undefined" && createPortal(
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] bg-[var(--surface)]/90 backdrop-blur-md border border-[var(--border)] rounded-full px-6 py-3 shadow-[var(--shadow-strong)] flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-xs font-semibold text-[var(--foreground-soft)]">
            Đang chọn <span className="text-[var(--primary)] font-bold">{selectedBatchIds.size}</span> đơn hàng
          </span>
          <div className="h-4 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchPrint}
              disabled={isPrinting}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--accent-green)] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[var(--accent-green-strong)] active:scale-95 transition-all disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              In hóa đơn
            </button>
            <button
              onClick={() => setSelectedBatchIds(new Set())}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 active:scale-95 transition-all"
              title="Hủy chọn tất cả"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>,
        document.body
      )}

      {toast && typeof document !== "undefined" && createPortal(<Toast message={toast.message} type={toast.type} />, document.body)}
    </div>
  );
}
