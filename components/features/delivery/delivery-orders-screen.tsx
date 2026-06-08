"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDeliveryOrders, useDeliveryProviders } from "@/hooks/use-delivery";
import { useHeaderStore } from "@/stores/header-store";
import { DeliveryDetailModal } from "./delivery-detail-modal";
import { Search, Filter, RefreshCw, Eye, Trash2, ArrowUpDown, ChevronLeft, ChevronRight, Copy, Check } from "lucide-react";
import { CONTROL_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/workspace-shared";
import { formatDateTime } from "@/lib/proxy-client";
import { Dropdown } from "@/components/ui/dropdown";

export function DeliveryOrdersScreen() {
  const setHeader = useHeaderStore((state) => state.setHeader);
  const resetHeader = useHeaderStore((state) => state.resetHeader);

  // Search and filters state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 15;

  // Selected order for modal detail
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, id: string) => {
    e.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

  const getProviderBadgeClass = (provider: string) => {
    const p = provider.toLowerCase().trim();
    if (p.includes("ghtk")) {
      return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/10";
    }
    if (p.includes("ghn")) {
      return "bg-orange-500/10 text-orange-600 border border-orange-500/10";
    }
    if (p.includes("j&t") || p.includes("jt")) {
      return "bg-red-500/10 text-red-600 border border-red-500/10";
    }
    if (p.includes("viettelpost") || p.includes("vtp") || p.includes("viettel post")) {
      return "bg-red-500/10 text-red-600 border border-red-500/10";
    }
    return "bg-blue-500/10 text-blue-600 border border-blue-500/10";
  };

  const renderCreatedAt = (createdAt: string) => {
    if (!createdAt) return <span className="text-[var(--muted)]">-</span>;
    try {
      const date = new Date(createdAt);
      if (Number.isNaN(date.getTime())) return <span className="text-[var(--muted)]">{createdAt}</span>;
      
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return (
        <div className="space-y-0.5">
          <span className="block text-[var(--foreground-soft)] font-medium">{day}/{month}/{year}</span>
          <span className="block text-[10px] text-[var(--muted)]">{hours}:{minutes}</span>
        </div>
      );
    } catch {
      return <span className="text-[var(--muted)]">{createdAt}</span>;
    }
  };

  // Fetch providers list
  const { data: providers = [] } = useDeliveryProviders();

  const providerOptions = React.useMemo(() => {
    return providers.map((p) => {
      const cleanLabel = p.displayName.replace(/\s*\(.*?\)\s*/g, "").trim();
      return {
        value: p.provider,
        label: cleanLabel || p.displayName,
      };
    });
  }, [providers]);

  const statusOptions = React.useMemo(() => [
    { value: "active", label: "Đang xử lý" },
    { value: "cancelled", label: "Đã hủy" }
  ], []);

  // Search input debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(handler);
  }, [search]);

  // Fetch history list
  const { data, isLoading, refetch, isFetching } = useDeliveryOrders({
    page,
    limit,
    search: debouncedSearch || undefined,
    provider: providerFilter || undefined,
    status: statusFilter || undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  // Setup page header
  useEffect(() => {
    setHeader({
      title: "Lịch sử giao hàng",
      subtitle: "Tra cứu hành trình vận đơn, quản lý chi phí và trạng thái giao hàng",
      showDateRange: false,
      actions: [],
    });
    return () => resetHeader();
  }, [setHeader, resetHeader]);

  const items = data?.items || [];
  const pagination = data?.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 };

  return (
    <div className="space-y-4 pb-12 select-none">
      
      {/* Filters & Actions Bar */}
      <div className="flex flex-col md:flex-row gap-3.5 items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        
        {/* Search & Provider Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--muted)]">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${CONTROL_CLASS} pl-9 w-full`}
              placeholder="Nhập mã vận đơn, mã đơn hàng..."
            />
          </div>

          <Dropdown
            value={providerFilter}
            onChange={(val) => {
              setProviderFilter(val);
              setPage(1);
            }}
            options={providerOptions}
            placeholder="Tất cả đơn vị"
            minWidth="176px"
            heightClass="h-9"
          />

          <Dropdown
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            options={statusOptions}
            placeholder="Trạng thái"
            minWidth="144px"
            heightClass="h-9"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
          <button
            onClick={() => void refetch()}
            disabled={isFetching || isLoading}
            className={`${SECONDARY_BUTTON_CLASS} p-2 flex items-center justify-center gap-1.5`}
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${(isFetching || isLoading) ? "animate-spin" : ""}`} />
            <span>Tải lại</span>
          </button>
        </div>

      </div>

      {/* Orders Table Panel */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-24">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-8 h-8 mx-auto text-[var(--muted)] opacity-35" />
            <p className="mt-3 text-xs text-[var(--foreground-soft)] font-medium">Không tìm thấy vận đơn giao hàng nào.</p>
            <p className="text-[10px] text-[var(--muted)] mt-1">Vui lòng kiểm tra lại bộ lọc hoặc tạo đơn hàng mới.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]/15 font-semibold text-[var(--muted)]">
                  <th className="px-5 py-3.5">Mã vận đơn / Đơn hàng gốc</th>
                  <th className="px-5 py-3.5">Đơn vị vận chuyển</th>
                  <th className="px-5 py-3.5">Trạng thái vận đơn</th>
                  <th className="px-5 py-3.5">Bưu cục hiện tại</th>
                  <th className="px-5 py-3.5">Ngày tạo đơn</th>
                  <th className="px-5 py-3.5 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const isCancelled = item.status === "cancelled" || item.status === "cancel";
                  const primaryCode = item.txlogisticId || item.billCode || "";
                  const secondaryCode = item.orderId || "";
                  const showSecondary = secondaryCode && !isObjectId(secondaryCode);
                  
                  return (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedOrderId(item.id)}
                      className="border-b border-[var(--border)]/70 hover:bg-[var(--hover)]/40 transition-colors duration-150 cursor-pointer group"
                    >
                      <td className="px-5 py-4 font-medium" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <div className="space-y-1">
                            <span className="block font-mono font-bold text-[var(--foreground)]">{primaryCode || "Chưa cấp"}</span>
                            {showSecondary && (
                              <span className="block font-mono text-[10px] text-[var(--muted)]">Gốc: {secondaryCode}</span>
                            )}
                          </div>
                          {primaryCode && (
                            <button
                              type="button"
                              onClick={(e) => handleCopy(e, primaryCode, item.id)}
                              className="p-1 rounded text-[var(--muted)] hover:bg-[var(--hover)] hover:text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Sao chép mã vận đơn"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getProviderBadgeClass(item.provider)}`}>
                          {item.provider}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600 border border-red-500/10">
                            Đã hủy
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600 border border-green-500/10">
                            Đang xử lý
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-[var(--foreground-soft)] font-medium">
                        {item.lastCenterName && item.lastCenterName !== "N/A" ? (
                          item.lastCenterName
                        ) : (
                          <span className="text-[var(--muted)] font-normal text-[11px]">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium">
                        {renderCreatedAt(item.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(item.id)}
                          className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--primary)] hover:bg-[var(--primary-soft)] transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--surface-muted)]/10">
          <span className="text-[11px] text-[var(--muted)] font-semibold">
            Hiển thị {items.length} trên tổng số {pagination.total} vận đơn
          </span>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`${SECONDARY_BUTTON_CLASS} p-1.5 disabled:opacity-40 disabled:pointer-events-none`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-[var(--foreground)] px-2">
                Trang {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className={`${SECONDARY_BUTTON_CLASS} p-1.5 disabled:opacity-40 disabled:pointer-events-none`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Detail Modal */}
      {selectedOrderId && (
        <DeliveryDetailModal
          orderId={selectedOrderId}
          isOpen={!!selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onRefreshList={() => refetch()}
        />
      )}

    </div>
  );
}
