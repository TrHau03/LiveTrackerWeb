"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useDeliveryOrders, useDeliveryProviders } from "@/hooks/use-delivery";
import { useHeaderStore } from "@/stores/header-store";
import { DeliveryDetailModal } from "./delivery-detail-modal";
import { Search, Filter, RefreshCw, Eye, Trash2, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { CONTROL_CLASS, SECONDARY_BUTTON_CLASS } from "@/components/ui/workspace-shared";
import { formatDateTime } from "@/lib/proxy-client";

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

  // Fetch providers list
  const { data: providers = [] } = useDeliveryProviders();

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
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--muted)]">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${CONTROL_CLASS} pl-9`}
              placeholder="Nhập mã vận đơn, mã đơn hàng..."
            />
          </div>

          <select
            value={providerFilter}
            onChange={(e) => {
              setProviderFilter(e.target.value);
              setPage(1);
            }}
            className={`${CONTROL_CLASS} w-full sm:w-44 font-medium`}
          >
            <option value="">Tất cả đơn vị</option>
            {providers.map((p) => (
              <option key={p.provider} value={p.provider}>
                {p.displayName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className={`${CONTROL_CLASS} w-full sm:w-36 font-medium`}
          >
            <option value="">Trạng thái</option>
            <option value="active">Đang xử lý</option>
            <option value="cancelled">Đã hủy</option>
          </select>
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
                  const primaryCode = item.billCode || item.txlogisticId || "";
                  const secondaryCode = item.orderId || "";
                  
                  return (
                    <tr 
                      key={item.id}
                      className="border-b border-[var(--border)]/70 hover:bg-[var(--hover)]/30 transition-colors duration-150"
                    >
                      <td className="px-5 py-4 font-medium">
                        <div className="space-y-1">
                          <span className="block font-mono font-bold text-[var(--foreground)]">{primaryCode || "Chưa cấp"}</span>
                          {secondaryCode && (
                            <span className="block font-mono text-[10px] text-[var(--muted)]">Gốc: {secondaryCode}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">
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
                        {item.lastCenterName || "N/A"}
                      </td>
                      <td className="px-5 py-4 text-[var(--muted)] font-medium">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right">
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
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--surface-muted)]/10">
            <span className="text-[11px] text-[var(--muted)] font-semibold">
              Hiển thị {items.length} trên tổng số {pagination.total} vận đơn
            </span>
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
          </div>
        )}
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
