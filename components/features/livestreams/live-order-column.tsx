"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "@/components/session-provider";
import { useQueryClient } from "@tanstack/react-query";
import { useLiveOrders } from "@/hooks/use-orders";
import { useCustomerDetail } from "@/hooks/use-customers";
import { useSettingsStore } from "@/stores/settings-store";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { asRecord, extractApiData, extractCollection, pickString, pickNumber, formatCurrency, formatDateTime } from "@/lib/proxy-client";
import { printReceiptHtml, printReceipt, renderReceiptToImage } from "@/lib/printUtils";
import { sendBill, deleteOrder, removeCommentFromOrder } from "@/lib/services/orders-service";
import { OrderReceipt } from "@/components/print/OrderReceipt";
import { PrintModeDropdown } from "@/components/print/PrintModeDropdown";
import { BridgeSetupModal } from "@/components/print/BridgeSetupModal";
import type { LiveStats } from "@/hooks/use-comments";
import type { PrintMode } from "@/types";

import {
  LoadingState,
  ErrorState,
  EmptyState,
  formatNumber,
  compactAddress,
} from "@/components/ui/workspace-shared";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function Toast({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-xl text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
      {message}
    </div>
  );
}

export function LiveOrderColumn({ 
  liveId, 
  liveStats,
  filterQuery = "",
  onFilterChange
}: { 
  liveId: string; 
  liveStats: LiveStats;
  filterQuery?: string;
  onFilterChange?: (query: string) => void;
}) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [customerPopupId, setCustomerPopupId] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { getPrintSettings } = usePrintSettings();

  // Confirmation States
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [commentToRemove, setCommentToRemove] = useState<Record<string, unknown> | null>(null);

  // Local Bridge offline modal state
  const [isBridgeOfflineOpen, setIsBridgeOfflineOpen] = useState(false);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const { data: customerDetailData } = useCustomerDetail(customerPopupId || "");
  const customerDetail = customerPopupId ? asRecord(extractApiData(customerDetailData)) : {};
  const customerTags = extractCollection(customerDetail.tags);
  const customerHistories = extractCollection(customerDetail.histories);

  const { data, status, error: queryError } = useLiveOrders(liveId);

  useEffect(() => {
    setSelectedOrderId(null);
  }, [liveId]);

  const state = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data || null,
    error: queryError ? queryError.message : "",
  }

  const orders = extractCollection(state.data);
  const filteredOrders = orders.filter(o => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    const name = (pickString(asRecord(o.customerId), ["igName"]) || pickString(o, ["igName", "customerName"]) || "").toLowerCase();
    const code = (pickString(o, ["orderCode", "code"]) || "").toLowerCase();
    return name.includes(q) || code.includes(q);
  });
  
  const selectedOrder = orders.find((o) => pickString(o, ["id", "_id", "orderCode"]) === selectedOrderId);
  const totalAmount = orders.reduce((sum, order) => sum + (pickNumber(order, ["totalPrice", "amount"]) ?? 0), 0);

  const handleDeleteOrder = async () => {
    const orderId = pickString(selectedOrder!, ["id", "_id"]);
    if (!orderId || deleteLoading || !session.accessToken) return;
    setDeleteLoading(true);
    try {
      const res = await deleteOrder(session, orderId);
      if (res.ok) {
        setSelectedOrderId(null);
        setConfirmDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: ["live_orders"] });
        showToast("Đã xoá đơn hàng");
      } else {
        showToast("Lỗi khi xoá đơn hàng", "error");
      }
    } catch { 
      showToast("Lỗi kết nối khi xoá đơn", "error");
    }
    setDeleteLoading(false);
  };

  const handleRemoveComment = async (comment: Record<string, unknown>) => {
    const commentId = pickString(comment, ["id", "_id", "commentId"]);
    if (!commentId || !session.accessToken) return;
    try {
      const res = await removeCommentFromOrder(session, commentId);
      if (res.ok) {
        setConfirmRemoveOpen(false);
        setCommentToRemove(null);
        showToast("Đã gỡ món khỏi đơn");
        queryClient.invalidateQueries({ queryKey: ["live_orders"] });
      } else {
        showToast("Không thể gỡ món", "error");
      }
    } catch { 
      showToast("Lỗi kết nối khi gỡ món", "error");
    }
  };

  return (
    <div className="flex h-full flex-col relative w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 shrink-0">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Đơn hàng đã chốt</h3>
        <div className="flex items-center gap-3">
          {typeof liveStats.totalOrder === 'number' && (
            <span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--surface-muted)] rounded-full px-2 py-0.5" title="Tổng số đơn hàng">
              {formatNumber(liveStats.totalOrder)} đơn
            </span>
          )}
          {typeof liveStats.totalItems === 'number' && (
            <span className="text-[10px] font-semibold text-[var(--primary)] bg-[color:var(--primary-soft)] rounded-full px-2 py-0.5" title="Tổng số sản phẩm">
              {formatNumber(liveStats.totalItems)} SP
            </span>
          )}
        </div>
      </div>

      <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/20 shrink-0 space-y-2">
        <div className="flex justify-between items-center px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Tổng thu</span>
          <span className="text-base font-bold tracking-tight text-[var(--primary)]">{formatCurrency(totalAmount)}</span>
        </div>
        
        <div className="relative">
            <input 
                type="text"
                placeholder="Tìm tên khách hoặc mã đơn..."
                value={filterQuery}
                onChange={(e) => onFilterChange?.(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-8 pr-8 py-1.5 text-xs focus:ring-1 focus:ring-[var(--primary)] focus:border-[var(--primary)] outline-none transition-all"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            {filterQuery && (
                <button 
                    onClick={() => onFilterChange?.("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[var(--surface-muted)] text-[var(--muted)] hover:text-red-500 transition-colors"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar-premium">
        {state.status === "loading" ? <LoadingState compact /> : null}
        {state.status === "error" ? <ErrorState message={state.error} compact /> : null}
        {state.status === "ready" && filteredOrders.length === 0 ? (
          <EmptyState message={filterQuery ? "Không tìm thấy kết quả." : "Livestream này chưa có đơn hàng."} compact />
        ) : null}

        <div className="space-y-2.5">
          {filteredOrders.map((order, i) => {
            const id = pickString(order, ["_id", "id", "orderCode"]);
            const isActive = selectedOrderId === id;
            return (
              <button
                key={`${id || i}`}
                onClick={() => setSelectedOrderId(id)}
                className={`w-full text-left rounded-xl border p-3.5 transition duration-200 ${isActive ? 'bg-[color:var(--primary-soft)] border-[color:var(--primary-soft)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] shadow-[var(--shadow-soft)]'
                  }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-6 w-6 overflow-hidden rounded-full ring-1 ring-[var(--border)] shadow-sm bg-[color:var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 text-[10px] relative">
                      {pickString(asRecord(order.customerId), ["avatar"]) ? (
                        <>
                          <img 
                            src={pickString(asRecord(order.customerId), ["avatar"])!} 
                            alt={pickString(asRecord(order.customerId), ["igName"]) || pickString(order, ["igName", "customerName"]) || "Avatar"} 
                            className="h-full w-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                            }} 
                          />
                          <div className="absolute inset-0 items-center justify-center bg-[color:var(--primary-soft)] text-[var(--primary)] font-bold hidden [.fallback-active_&]:flex uppercase">
                            {(pickString(asRecord(order.customerId), ["igName"]) || pickString(order, ["igName", "customerName"]) || "K").charAt(0)}
                          </div>
                        </>
                      ) : (
                        <span className="font-bold uppercase">
                          {(pickString(asRecord(order.customerId), ["igName"]) || pickString(order, ["igName", "customerName"]) || "K").charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="truncate">
                      {pickString(asRecord(order.customerId), ["igName"]) || pickString(order, ["igName", "customerName"]) || "Khách hàng"}
                    </span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? 'text-[var(--primary-strong)]' : 'text-[var(--primary)]'}`}>
                    {formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className={`font-mono text-[10px] tracking-wider ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>
                    #{pickString(order, ["orderCode", "code"]) || id?.substring(0, 8)}
                  </span>
                  <span className={`font-medium ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>
                    Chờ thanh toán
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slide-out Panel For Order Detail */}
      <div
        className={`absolute inset-x-0 bottom-0 top-1/3 z-10 flex flex-col bg-[var(--surface)] shadow-[0_-15px_60px_-15px_rgba(0,0,0,0.3)] border border-[var(--border)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedOrder ? 'translate-y-0 h-auto' : 'translate-y-full h-auto pointer-events-none opacity-0'}`}
      >
        {selectedOrder && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4 shrink-0 bg-[var(--surface-muted)]/30">
              <div>
                <h4 className="text-sm font-bold text-[var(--foreground)]">Chi tiết đơn</h4>
                <p className="font-mono text-[10px] text-[var(--muted)] tracking-widest mt-0.5 uppercase">
                  #{pickString(selectedOrder, ["orderCode", "code"]) || "Order"}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] shadow hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar-premium">
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Thông tin người mua</h5>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subdued)] p-3.5 space-y-2.5">
                  <button
                    onClick={() => {
                      const custId = pickString(asRecord(selectedOrder?.customerId), ["id", "_id"]) || pickString(selectedOrder, ["customerId"]);
                      setCustomerPopupId(customerPopupId === custId ? null : custId);
                    }}
                    className="font-semibold text-[var(--primary)] text-sm hover:underline transition-colors text-left w-full flex items-center gap-2"
                  >
                    <div className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-[var(--surface)] shadow-sm bg-[color:var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 text-xs relative">
                      {pickString(asRecord(selectedOrder?.customerId), ["avatar"]) ? (
                        <>
                          <img 
                            src={pickString(asRecord(selectedOrder?.customerId), ["avatar"])!} 
                            alt="Avatar" 
                            className="h-full w-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                            }} 
                          />
                          <div className="absolute inset-0 items-center justify-center bg-[color:var(--primary-soft)] text-[var(--primary)] font-bold hidden [.fallback-active_&]:flex uppercase">
                            {(pickString(asRecord(selectedOrder?.customerId), ["igName"]) || pickString(selectedOrder, ["igName", "customerName"]) || "K").charAt(0)}
                          </div>
                        </>
                      ) : (
                        <span className="font-bold uppercase">
                          {(pickString(asRecord(selectedOrder?.customerId), ["igName"]) || pickString(selectedOrder, ["igName", "customerName"]) || "K").charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="flex-1 truncate">
                      {pickString(asRecord(selectedOrder?.customerId), ["igName"]) || pickString(selectedOrder, ["igName", "customerName"]) || "Người mua"}
                    </span>
                    <svg className={`h-3 w-3 text-[var(--muted)] transition-transform shrink-0 ${customerPopupId ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <p className="text-xs text-[var(--foreground-soft)] flex items-center gap-1.5 font-medium">
                    <svg className="h-3.5 w-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {pickString(selectedOrder, ["phone"]) || "Chưa gửi SĐT"}
                  </p>
                  <p className="text-xs text-[var(--foreground-soft)] flex items-start gap-1.5 font-medium">
                    <svg className="h-3.5 w-3.5 text-[var(--muted)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="truncate">{compactAddress(selectedOrder) || "Chưa gửi địa chỉ"}</span>
                  </p>
                </div>

                {customerPopupId && Object.keys(customerDetail).length > 0 && (
                  <div className="rounded-xl border border-[var(--primary)]/30 bg-[color:var(--primary-soft)] p-3.5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">Hồ sơ khách hàng</span>
                      <button onClick={() => setCustomerPopupId(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-3 border-b border-[var(--primary)]/10 pb-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-[var(--surface)] shadow-sm bg-[color:var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 text-sm relative">
                        {pickString(customerDetail, ["avatar"]) ? (
                          <>
                            <img 
                              src={pickString(customerDetail, ["avatar"])!} 
                              alt="Avatar" 
                              className="h-full w-full object-cover" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
                              }} 
                            />
                            <div className="absolute inset-0 items-center justify-center bg-[color:var(--primary-soft)] text-[var(--primary)] font-bold hidden [.fallback-active_&]:flex uppercase">
                              {(pickString(customerDetail, ["igName", "name"]) || "K").charAt(0)}
                            </div>
                          </>
                        ) : (
                          <span className="font-bold uppercase">
                            {(pickString(customerDetail, ["igName", "name"]) || "K").charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <h6 className="font-bold text-[var(--foreground)] text-xs">
                          {pickString(customerDetail, ["igName", "name"]) || "Khách hàng"}
                        </h6>
                        <p className="text-[10px] text-[var(--muted)]">Instagram customer</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      {pickString(customerDetail, ["phone"]) && (
                        <p className="flex items-center gap-1.5 text-[var(--foreground)]">
                          <span className="text-[var(--muted)] font-medium w-16 shrink-0">SĐT:</span>
                          {pickString(customerDetail, ["phone"])}
                        </p>
                      )}
                      {pickString(customerDetail, ["dayOfBirth"]) && (
                        <p className="flex items-center gap-1.5 text-[var(--foreground)]">
                          <span className="text-[var(--muted)] font-medium w-16 shrink-0">Sinh nhật:</span>
                          {formatDateTime(pickString(customerDetail, ["dayOfBirth"]))}
                        </p>
                      )}
                      {pickString(customerDetail, ["note"]) && (
                        <p className="flex items-start gap-1.5 text-[var(--foreground)]">
                          <span className="text-[var(--muted)] font-medium w-16 shrink-0">Ghi chú:</span>
                          <span className="break-words">{pickString(customerDetail, ["note"])}</span>
                        </p>
                      )}
                    </div>
                    {customerTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {customerTags.map((tag, i) => (
                          <span key={pickString(tag, ["id", "_id"]) || i} className="inline-flex rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)] shadow-sm border border-[var(--border)]">
                            {pickString(tag, ["label", "name"])}
                          </span>
                        ))}
                      </div>
                    )}
                    {customerHistories.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Lịch sử gần đây</span>
                        {customerHistories.slice(0, 3).map((h, i) => (
                          <p key={i} className="text-[10px] text-[var(--foreground-soft)] pl-2 border-l-2 border-[var(--primary)]/30">
                            {pickString(h, ["title", "action", "type", "note"]) || "Hoạt động"}
                          </p>
                        ))}
                      </div>
                    )}
                    <Link href="/customers" className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--primary)] hover:underline pt-1">
                      Xem đầy đủ →
                    </Link>
                  </div>
                )}
              </div>

              {(() => {
                const orderComments = extractCollection(selectedOrder?.commentIds || selectedOrder?.comments);
                if (orderComments.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Danh sách món hàng ({orderComments.length})</h5>
                    <div className="space-y-2">
                      {orderComments.map((c, idx) => {
                        const cid = pickString(c, ["id", "_id", "commentId"]) || `ord-item-${idx}`;
                        const quantity = pickNumber(c, ["quantity"]) ?? 1;
                        const price = pickNumber(c, ["price"]) ?? 0;
                        const status = pickString(c, ["status"]);

                        return (
                          <div key={cid} className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subdued)] px-3 py-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 space-y-1">
                                <p className="text-xs font-semibold text-[var(--foreground)] leading-tight">{pickString(c, ["text", "content"])}</p>
                                <div className="flex flex-wrap gap-1">
                                  {status === "BACKUP" && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider">Dự bị</span>
                                  )}
                                  {status === "CONFIRMED_ERROR" && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-wider">Đã báo lỗi</span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => { setCommentToRemove(c); setConfirmRemoveOpen(true); }}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-red-50 hover:text-red-500 transition-colors -mt-1 -mr-1"
                                title="Gỡ khỏi đơn"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold bg-[var(--surface-muted)] px-1.5 py-0.5 rounded text-[var(--muted)] border border-[var(--border)]">SL: {quantity}</span>
                                  <span className="text-[10px] text-[var(--muted)] truncate max-w-[100px]">@{pickString(c, ["igUsername", "username"])}</span>
                               </div>
                               {price > 0 && <span className="text-xs font-black text-[var(--primary)]">{formatCurrency(price)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <h5 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Tổng kết đơn</h5>
                <div className="rounded-xl justify-between flex items-center border border-[var(--border)] bg-[var(--surface-subdued)] p-3.5">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Thành tiền</span>
                  <span className="text-lg font-bold text-[var(--primary)]">{formatCurrency(pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-subdued)] shrink-0 flex gap-3">
              <button
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleteLoading}
                className="rounded-xl bg-red-600 text-white border border-red-600 hover:bg-red-700 shadow-sm transition active:scale-95 disabled:opacity-50 px-4 py-2.5 text-xs font-bold shrink-0 shadow-[var(--shadow-soft)] duration-150"
              >
                {deleteLoading ? "Đang xoá..." : "Xoá đơn"}
              </button>
              <PrintModeDropdown
                className="flex-1"
                size="md"
                disabled={isPrinting}
                onSelect={async (mode: PrintMode) => {
                  if (!selectedOrder || isPrinting) return;
                  setIsPrinting(true);
                  try {
                    const settings = await getPrintSettings("order");
                    const shopInfo = { name: "MINI SHOP", address: "", phone: "" };

                    if (mode === "print_only" || mode === "print_and_send") {
                      // Render to hidden container and print
                      const container = document.createElement("div");
                      container.style.position = "absolute";
                      container.style.left = "-9999px";
                      document.body.appendChild(container);

                      const { createRoot } = await import("react-dom/client");
                      const root = createRoot(container);
                      root.render(
                        <OrderReceipt order={selectedOrder} settings={settings} shopInfo={shopInfo} />
                      );

                      await new Promise(r => setTimeout(r, 150));
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
                    }

                    if (mode === "send_only" || mode === "print_and_send") {
                      const igUserId = pickString(asRecord(selectedOrder?.customerId), ["igId"]) || pickString(selectedOrder, ["igId", "customerId"]);
                      const orderId = pickString(selectedOrder, ["id", "_id"]);
                      
                      if (igUserId && orderId) {
                        const container = document.createElement("div");
                        container.style.position = "absolute";
                        container.style.left = "-9999px";
                        document.body.appendChild(container);

                        const { createRoot } = await import("react-dom/client");
                        const root = createRoot(container);
                        root.render(
                          <div style={{ padding: "20px" }}>
                            <OrderReceipt order={selectedOrder} settings={settings} shopInfo={shopInfo} />
                          </div>
                        );

                        await new Promise(r => setTimeout(r, 200));
                        const receiptEl = container.querySelector(".receipt") as HTMLElement;
                        
                        if (receiptEl && session.accessToken) {
                          try {
                            const blob = await renderReceiptToImage(receiptEl);
                            const res = await sendBill(session, orderId, blob, igUserId);
                            if (res.ok) {
                              console.log("Send bill success", res.status);
                            } else {
                              console.error("Send bill failed");
                            }
                          } catch (e) {
                            console.error("html2canvas error", e);
                          }
                        }

                        root.unmount();
                        if (container.parentNode) document.body.removeChild(container);
                      }
                    }
                  } catch (err) {
                    console.error("Print error:", err);
                  } finally {
                    setIsPrinting(false);
                  }
                }}
              />
            </div>

            <ConfirmDialog
              isOpen={confirmDeleteOpen}
              title="Xác nhận xoá đơn hàng"
              message={
                  <div className="space-y-3">
                      <p>Bạn có chắc chắn muốn xoá toàn bộ đơn hàng này không? Hành động này sẽ giải phóng tất cả các bình luận trong đơn về trạng thái chưa chốt.</p>
                      <div className="rounded-xl bg-red-50 p-3 border border-red-100 flex items-center justify-between">
                          <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 block">Đơn hàng của</span>
                              <span className="text-sm font-bold text-red-700">{pickString(asRecord(selectedOrder?.customerId), ["igName"]) || pickString(selectedOrder, ["igName", "customerName"]) || "Khách hàng"}</span>
                          </div>
                          <span className="text-base font-black text-red-700">{formatCurrency(pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0)}</span>
                      </div>
                  </div>
              }
              confirmLabel="Xoá đơn ngay"
              cancelLabel="Quay lại"
              isDanger={true}
              onConfirm={handleDeleteOrder}
              onCancel={() => setConfirmDeleteOpen(false)}
            />

            <ConfirmDialog
              isOpen={confirmRemoveOpen}
              title="Xác nhận gỡ món"
              message={
                  <div className="space-y-3">
                      <p>Bạn có chắc chắn muốn gỡ sản phẩm này khỏi đơn hàng không?</p>
                      <div className="rounded-xl bg-[var(--surface-muted)]/50 p-3 border border-[var(--border)] space-y-2">
                          <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-[var(--primary)]">@{pickString(commentToRemove, ["igUsername", "username"])}</span>
                          </div>
                          <p className="text-xs text-[var(--foreground-soft)] italic">"{pickString(commentToRemove, ["text", "content"])}"</p>
                      </div>
                  </div>
              }
              confirmLabel="Gỡ khỏi đơn"
              cancelLabel="Quay lại"
              isDanger={true}
              onConfirm={() => commentToRemove && handleRemoveComment(commentToRemove)}
              onCancel={() => { setConfirmRemoveOpen(false); setCommentToRemove(null); }}
            />
          </>
        )}
      </div>

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
