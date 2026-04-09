"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "@/components/session-provider";
import { useQueryClient } from "@tanstack/react-query";
import { useLiveOrders } from "@/hooks/use-orders";
import { useCustomerDetail } from "@/hooks/use-customers";
import { useSettingsStore } from "@/stores/settings-store";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { asRecord, extractApiData, extractCollection, pickString, pickNumber, formatCurrency, formatDateTime } from "@/lib/proxy-client";
import type { LiveStats } from "@/hooks/use-comments";

import {
  LoadingState,
  ErrorState,
  EmptyState,
  formatNumber,
  compactAddress,
} from "@/components/ui/workspace-shared";

export function LiveOrderColumn({ liveId, liveStats }: { liveId: string; liveStats: LiveStats }) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [customerPopupId, setCustomerPopupId] = useState<string | null>(null);

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
  const selectedOrder = orders.find((o) => pickString(o, ["id", "_id", "orderCode"]) === selectedOrderId);
  const totalAmount = orders.reduce((sum, order) => sum + (pickNumber(order, ["totalPrice", "amount"]) ?? 0), 0);

  const handleDeleteOrder = async () => {
    const orderId = pickString(selectedOrder!, ["id", "_id"]);
    if (!orderId || deleteLoading || !session.accessToken) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/orders/${orderId}`,
          method: "DELETE",
          headers: { "Authorization": `Bearer ${session.accessToken}` },
        }),
      });
      if (res.ok) {
        setSelectedOrderId(null);
        queryClient.invalidateQueries({ queryKey: ["live_orders"] });
      }
    } catch { /* ignore */ }
    setDeleteLoading(false);
  };

  const handleRemoveComment = async (commentId: string) => {
    const orderId = pickString(selectedOrder!, ["id", "_id"]);
    if (!orderId || !commentId || !session.accessToken) return;
    try {
      const res = await fetch(`/api/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/orders/${orderId}/comments/${commentId}`,
          method: "DELETE",
          headers: { "Authorization": `Bearer ${session.accessToken}` },
        }),
      });
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    } catch { /* ignore */ }
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

      <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/20 shrink-0">
        <div className="flex justify-between items-center px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Tổng thu</span>
          <span className="text-base font-bold tracking-tight text-[var(--primary)]">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {state.status === "loading" ? <LoadingState compact /> : null}
        {state.status === "error" ? <ErrorState message={state.error} compact /> : null}
        {state.status === "ready" && orders.length === 0 ? (
          <EmptyState message="Livestream này chưa có đơn hàng." compact />
        ) : null}

        <div className="space-y-2.5">
          {orders.map((order, i) => {
            const id = pickString(order, ["id", "_id", "orderCode"]);
            const isActive = selectedOrderId === id;
            return (
              <button
                key={`${id || i}`}
                onClick={() => setSelectedOrderId(id)}
                className={`w-full text-left rounded-xl border p-3.5 transition duration-200 ${isActive ? 'bg-[color:var(--primary-soft)] border-[color:var(--primary-soft)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] shadow-[var(--shadow-soft)]'
                  }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                      {pickString(asRecord(order.customerId), ["igName"]) || pickString(order, ["igName", "customerName"]) || "Khách hàng"}
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
        className={`absolute inset-x-0 bottom-0 top-1/3 z-10 flex flex-col bg-[var(--surface)] shadow-[0_-15px_60px_-15px_rgba(0,0,0,0.3)] rounded-t-2xl border border-[var(--border)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedOrder ? 'translate-y-0 h-auto' : 'translate-y-full h-auto pointer-events-none opacity-0'}`}
      >
        {selectedOrder && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4 shrink-0 bg-[var(--surface-muted)]/30 rounded-t-2xl">
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

            <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Thông tin người mua</h5>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subdued)] p-3.5 space-y-2.5">
                  <button
                    onClick={() => {
                      const custId = pickString(asRecord(selectedOrder.customerId), ["id", "_id"]) || pickString(selectedOrder, ["customerId"]);
                      setCustomerPopupId(customerPopupId === custId ? null : custId);
                    }}
                    className="font-semibold text-[var(--primary)] text-sm hover:underline transition-colors text-left w-full flex items-center gap-1.5"
                  >
                    {pickString(asRecord(selectedOrder.customerId), ["igName"]) || pickString(selectedOrder, ["igName", "customerName"]) || "Người mua"}
                    <svg className={`h-3 w-3 text-[var(--muted)] transition-transform ${customerPopupId ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
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
                const orderComments = extractCollection(selectedOrder.comments);
                if (orderComments.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Bình luận trong đơn ({orderComments.length})</h5>
                    <div className="space-y-2">
                      {orderComments.map((c, idx) => (
                        <div key={pickString(c, ["id", "_id"]) || idx} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-subdued)] px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--foreground)] truncate">{pickString(c, ["igUsername", "username"])}</p>
                            <p className="text-[10px] text-[var(--foreground-soft)] truncate">{pickString(c, ["text", "content"])}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveComment(pickString(c, ["id", "_id"]))}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-red-50 hover:text-red-500 transition-colors ml-2"
                            title="Gỡ comment khỏi đơn"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
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
                onClick={handleDeleteOrder}
                disabled={deleteLoading}
                className="flex-1 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 shadow-[var(--shadow-soft)] hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
              >
                {deleteLoading ? "Đang xoá..." : "Xoá đơn"}
              </button>
              <button className="flex-1 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-strong)] transition-colors">
                Phát link Pay
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
