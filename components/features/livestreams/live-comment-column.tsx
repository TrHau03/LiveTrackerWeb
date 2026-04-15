"use client";

import React, { useState, useEffect, useRef, startTransition, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSession } from "@/components/session-provider";
import { useQueryClient } from "@tanstack/react-query";
import { useCommentsStream, type LiveStats } from "@/hooks/use-comments";
import { useSettingsStore } from "@/stores/settings-store";
import { usePrintSettings } from "@/hooks/usePrintSettings";
import { streamProxyRequest } from "@/lib/proxy-client";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { asRecord, pickString, pickNumber, pickBoolean, extractCollection } from "@/lib/proxy-client";
import { createOrder } from "@/lib/services/orders-service";
import { updateComment, linkBackup, unlinkBackup } from "@/lib/services/comments-service";
import { printReceiptHtml, RECEIPT_CSS } from "@/lib/printUtils";
import { CommentReceipt } from "@/components/print/CommentReceipt";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import {
  LoadingState,
  ErrorState,
  EmptyState,
  formatNumber,
  safelyParseEvent
} from "@/components/ui/workspace-shared";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ═══════════════════════════════════════════
// CUSTOMER TAG DROPDOWN (unchanged)
// ═══════════════════════════════════════════

function CustomerTagDropdown({ tags, customerId, customerName, isNewCustomer, onSave }: { tags: Record<string, unknown>[], customerId: string, customerName: string, isNewCustomer?: boolean, onSave: (tagIds: string[]) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleTag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newKeys = new Set(selectedIds);
    if (newKeys.has(id)) newKeys.delete(id);
    else newKeys.add(id);
    setSelectedIds(newKeys);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving || selectedIds.size === 0) return;
    setIsSaving(true);
    await onSave(Array.from(selectedIds));
    setIsSaving(false);
    setSelectedIds(new Set());
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity p-1 -m-1"
        title="Gắn thẻ khách hàng"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl z-[100] animate-in fade-in slide-in-from-top-2">
          <div className="mb-2 px-2 pb-2 border-b border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--foreground)] w-full truncate block" title={customerName}>{customerName}</span>
            {isNewCustomer && <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 uppercase tracking-widest">Khách mới</span>}
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
            {tags.map(tag => {
              const id = pickString(tag, ["id", "_id"]) || "";
              const isSelected = selectedIds.has(id);
              return (
                <button
                  key={id}
                  onClick={(e) => toggleTag(id, e)}
                  className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-colors ${isSelected ? 'bg-[color:var(--primary-soft)] text-[var(--primary)] font-semibold' : 'text-[var(--foreground)] hover:bg-[var(--surface-muted)]'}`}
                >
                  <span className="truncate">{pickString(tag, ["name", "label"]) || "Tag"}</span>
                  {isSelected && <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>}
                </button>
              );
            })}
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border)]">
            <button
              onClick={handleSave}
              disabled={isSaving || selectedIds.size === 0}
              className="w-full rounded-lg bg-[var(--primary)] py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Đang lưu..." : "Lưu thẻ"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CUSTOMER CLOSED ITEMS DROPDOWN
// ═══════════════════════════════════════════

function CustomerClosedItemsDropdown({
  customerId,
  igUserId,
  customerClosedCount,
  allComments,
  onCancelOrder,
  onFilterCustomer,
  loadingComments
}: {
  customerId?: string;
  igUserId: string;
  customerClosedCount: number;
  allComments: Record<string, unknown>[];
  onCancelOrder: (comment: Record<string, unknown>) => Promise<void>;
  onFilterCustomer?: (query: string) => void;
  loadingComments: Set<string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const closedItems = allComments.filter(c => {
    const cid = pickString(c, ["customerId", "customer_id"]);
    const uid = pickString(c, ["igUserId", "ig_user_id"]);
    const status = pickString(c, ["status"]);
    // Ưu tiên khớp theo igUserId vì nó là định danh duy nhất của Instagram
    const isSameCustomer = (igUserId && uid === igUserId) || (customerId && cid === customerId);
    return isSameCustomer && (status === "NORMAL" || status === "SUCCESS");
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (onFilterCustomer) {
      const firstC = allComments.find(c => {
        const uid = pickString(c, ["igUserId", "ig_user_id"]);
        return uid === igUserId;
      });
      onFilterCustomer(pickString(firstC, ["igUsername", "username"]) || "");
    }
  };

  if (customerClosedCount <= 0 && closedItems.length === 0) return null;

  return (
    <div className="relative mt-1 flex justify-center w-full" ref={dropdownRef}>
      <button
        onClick={handleClick}
        className="flex items-center justify-center text-[var(--muted)] hover:text-green-600 transition-colors p-1 cursor-pointer shrink-0"
        title="Số lượng món đã mua (Click để xem và lọc đơn)"
      >
        <div className="relative">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.3 5h12.6M9 19h.01M16 19h.01" /></svg>
            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-600 text-[8px] font-bold text-white ring-1 ring-white animate-in zoom-in-50 duration-200">
                {customerClosedCount}
            </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl z-[100] animate-in fade-in slide-in-from-top-2">
          <div className="mb-2 px-1 pb-2 border-b border-[var(--border)]">
            <span className="text-xs font-semibold text-[var(--foreground)] w-full block">Các món đã chốt hiện tại</span>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scrollbar">
            {closedItems.length === 0 ? (
              <div className="text-xs text-[var(--muted)] px-2 py-1 italic text-center">Chưa tải đủ lịch sử trên trang.</div>
            ) : (
              closedItems.map((item, index) => {
                const cid = pickString(item, ["id", "_id", "commentId"]) || `item-${index}`;
                const text = pickString(item, ["text", "content"]);
                const quantity = pickNumber(item, ["quantity"]) ?? 1;
                const price = pickNumber(item, ["price"]) ?? 0;
                const isLoading = loadingComments.has(cid);

                return (
                  <div key={cid} className="flex flex-col gap-1 rounded-lg px-2 py-2 border border-dashed border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors text-left bg-[var(--surface-subtle)]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-medium text-[var(--foreground)] line-clamp-2 leading-tight">{text}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onCancelOrder(item); }}
                        disabled={isLoading}
                        title="Huỷ chốt"
                        className="shrink-0 p-1 -m-1 rounded-full text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        ) : (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-[10px] text-[var(--muted)] font-medium bg-[var(--border)] px-1 rounded">SL: {quantity}</span>
                      {price > 0 && <span className="text-[10px] text-[var(--primary)] font-bold">{formatNumber(price)}đ</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════

function Toast({ message, type = "success" }: { message: string; type?: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 rounded-xl text-xs font-bold shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
      {message}
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════

export function LiveCommentColumn({
  liveId,
  onLiveStatsUpdate,
  onFilterCustomer
}: {
  liveId: string;
  onLiveStatsUpdate?: (stats: LiveStats) => void;
  onFilterCustomer?: (query: string) => void;
}) {
  const { session, patchSession, logout } = useSession();
  const queryClient = useQueryClient();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const commentDisplayOrder = useSettingsStore(state => state.commentDisplayOrder);
  const autoReconnectSSE = useSettingsStore(state => state.autoReconnectSSE);
  const isNewestAtBottom = commentDisplayOrder === "newest_at_bottom";
  const [atBottom, setAtBottom] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const { getPrintSettings } = usePrintSettings();

  // Loading state per comment
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Confirm cancel state
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [commentToCancel, setCommentToCancel] = useState<Record<string, unknown> | null>(null);

  // Print receipt ref
  const printContainerRef = useRef<HTMLDivElement>(null);

  const tags: Record<string, unknown>[] = [];

  const {
    comments: historyComments,
    fetchMoreComments,
    hasMore,
    isLoadingMore,
    liveStats: hookLiveStats,
  } = useCommentsStream(liveId);

  const [realtimeComments, setRealtimeComments] = useState<Record<string, unknown>[]>([]);
  const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "stopped" | "error">("connecting");
  const [stats, setStats] = useState<LiveStats>({ totalOrder: 0, totalComment: 0, totalItems: 0 });
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isComponentMounted = useRef(true);
  const onLiveStatsUpdateRef = useRef(onLiveStatsUpdate);

  useEffect(() => {
    onLiveStatsUpdateRef.current = onLiveStatsUpdate;
  }, [onLiveStatsUpdate]);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => { isComponentMounted.current = false; };
  }, []);

  useEffect(() => {
    if (onLiveStatsUpdateRef.current && (hookLiveStats.totalOrder > 0 || hookLiveStats.totalComment > 0)) {
      onLiveStatsUpdateRef.current(hookLiveStats);
    }
  }, [hookLiveStats.totalOrder, hookLiveStats.totalComment, hookLiveStats.totalItems]);

  useEffect(() => {
    setRealtimeComments([]);
    setStats({ totalOrder: 0, totalComment: 0, totalItems: 0 });

    function startSSE() {
      if (!liveId || !session.accessToken) return () => { };
      const controller = new AbortController();

      startTransition(() => {
        setSseStatus("connecting");
      });

      streamProxyRequest(
        session,
        { path: `/comments/live/${liveId}/stream`, method: "GET" },
        (event) => {
          if (!isComponentMounted.current) return;
          startTransition(() => {
            setSseStatus("live");
          });

          const payload = safelyParseEvent(event.data);
          const rawData = asRecord(payload.data || payload.comment || payload);
          const eventType = pickString(payload, ["type"]) || event.event;

          if (eventType === "stats_updated" || eventType === "live_stats_updated") {
            setStats(prev => ({
              totalOrder: pickNumber(rawData, ["totalOrder"]) ?? prev.totalOrder,
              totalComment: pickNumber(rawData, ["totalComment"]) ?? prev.totalComment,
              totalItems: pickNumber(rawData, ["totalItems"]) ?? prev.totalItems,
            }));
          } else if (eventType === "comment_created" || eventType === "new_comment") {
            const nextComment = rawData;
            if (Object.keys(nextComment).length > 0) {
              setRealtimeComments(current => {
                const newCurrent = [...current, nextComment];
                return newCurrent.length > 500 ? newCurrent.slice(newCurrent.length - 500) : newCurrent;
              });
              const keyStr = pickString(nextComment, ["id", "_id", "commentId"]) || "";
              if (keyStr) queryClient.invalidateQueries({ queryKey: ["live_orders"] });
            }
          } else if (eventType === "comment_updated") {
            const updatedComment = rawData;
            const mid = pickString(updatedComment, ["_id", "id", "commentId"]);
            if (mid) {
              setRealtimeComments(current => current.map(c => {
                const cid = pickString(c, ["_id", "id", "commentId"]);
                return cid === mid ? { ...c, ...updatedComment } : c;
              }));
            }
          } else if (eventType === "customer_info_updated") {
            const infoData = rawData;
            const igUserId = pickString(infoData, ["igUserId"]);
            if (igUserId) {
              setRealtimeComments(current => current.map(c => {
                if (pickString(c, ["igUserId"]) === igUserId) {
                  return { ...c, ...infoData };
                }
                return c;
              }));
            }
          } else if (eventType === "backup_event") {
            const backupPayload = asRecord(payload.data || payload);
            const commentInfo = asRecord(backupPayload.comment || backupPayload.backupComment);
            const mid = pickString(commentInfo, ["_id", "id", "commentId"]);

            if (mid) {
              setRealtimeComments(current => current.map(c => {
                const cid = pickString(c, ["_id", "id", "commentId"]);
                return cid === mid ? { ...c, ...commentInfo } : c;
              }));
            }
          }
        },
        controller.signal,
      )
        .then((response) => {
          if (!isComponentMounted.current) return;
          if (!response) return;
          applyAuthResponses([response], patchSession, logout);
          if (!response.ok) {
            startTransition(() => { setSseStatus("error"); });
            if (autoReconnectSSE) {
              reconnectTimeoutRef.current = setTimeout(startSSE, 5000);
            }
          }
        })
        .catch(() => {
          if (!isComponentMounted.current) return;
          if (!controller.signal.aborted) {
            startTransition(() => { setSseStatus("error"); });
            if (autoReconnectSSE) {
              reconnectTimeoutRef.current = setTimeout(startSSE, 5000);
            }
          }
        });

      return () => {
        controller.abort();
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      };
    }

    const cleanup = startSSE();
    return cleanup;
  }, [liveId, session.accessToken, patchSession, logout, queryClient, autoReconnectSSE]);
  
  // Cập nhật stats lên component cha khi có thay đổi
  useEffect(() => {
    if (onLiveStatsUpdate) {
      onLiveStatsUpdate(stats);
    }
  }, [stats, onLiveStatsUpdate]);

  const allComments = [...historyComments, ...realtimeComments];
  const uniqueCommentsMap = new Map<string, Record<string, unknown>>();
  for (const c of allComments) {
    const cid = pickString(c, ["id", "_id", "commentId"]);
    if (cid) uniqueCommentsMap.set(cid, c);
  }
  const uniqueComments = Array.from(uniqueCommentsMap.values()).sort((a, b) => {
    const tA = new Date(pickString(a, ["createdAt", "created_at"]) || 0).getTime();
    const tB = new Date(pickString(b, ["createdAt", "created_at"]) || 0).getTime();
    return tA - tB;
  });

  const displayComments = isNewestAtBottom ? uniqueComments : [...uniqueComments].reverse();

  // ═══════════════════════════════════════════
  // HELPER: set/unset loading for a comment
  // ═══════════════════════════════════════════

  const setCommentLoading = (commentId: string, loading: boolean) => {
    setLoadingComments(prev => {
      const next = new Set(prev);
      if (loading) next.add(commentId);
      else next.delete(commentId);
      return next;
    });
  };

  // ═══════════════════════════════════════════
  // HELPER: trigger print for a comment
  // ═══════════════════════════════════════════

  const triggerCommentPrint = useCallback(async (
    comment: Record<string, unknown>,
    actionType: "NORMAL" | "CONFIRMED_ERROR" = "NORMAL"
  ) => {
    try {
      const settings = await getPrintSettings("comment");

      // TODO: get real shop info from user profile
      const shopInfo = { name: "MINI SHOP", address: "", phone: "" };

      // Create a temporary container with receipt
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "-9999px";
      document.body.appendChild(container);

      // We need to render React component to HTML manually
      const { createRoot } = await import("react-dom/client");
      const root = createRoot(container);

      await new Promise<void>((resolve) => {
        root.render(
          <CommentReceipt
            comment={{
              igUsername: pickString(comment, ["igUsername", "username"]),
              text: pickString(comment, ["text", "content"]),
              price: pickNumber(comment, ["price"]) ?? 0,
              quantity: pickNumber(comment, ["quantity"]) ?? 1,
              createdAt: pickString(comment, ["createdAt"]),
              backupOf: typeof comment.backupOf === "string" ? comment.backupOf : undefined,
            }}
            settings={settings}
            shopInfo={shopInfo}
            actionType={actionType}
          />
        );
        // Give React time to render
        setTimeout(resolve, 100);
      });

      const receiptEl = container.querySelector(".receipt") as HTMLElement;
      if (receiptEl) {
        printReceiptHtml(receiptEl);
      }

      // Cleanup after print
      setTimeout(() => {
        root.unmount();
        if (container.parentNode) document.body.removeChild(container);
      }, 2000);
    } catch (err) {
      console.error("Print error:", err);
    }
  }, [getPrintSettings]);

  // ═══════════════════════════════════════════
  // ACTION: Chốt đơn (NORMAL) / Đã báo lỗi (CONFIRMED_ERROR)
  // ═══════════════════════════════════════════

  const handleConfirmOrder = async (
    comment: Record<string, unknown>,
    actionType: "NORMAL" | "CONFIRMED_ERROR"
  ) => {
    const commentId = pickString(comment, ["id", "_id", "commentId"]);
    const status = pickString(comment, ["status"]);
    const igUserId = pickString(comment, ["igUserId"]);
    const igUsername = pickString(comment, ["igUsername", "username"]);

    if (!commentId || !session.accessToken) return;

    // Guard: only null status can be confirmed
    if (status) {
      showToast("Comment đã được xử lý", "error");
      return;
    }

    if (!igUserId) {
      showToast("Thiếu thông tin khách hàng", "error");
      return;
    }

    setCommentLoading(commentId, true);
    try {
      const response = await createOrder(session, {
        igId: igUserId,
        igName: igUsername,
        liveId,
        commentId,
        actionType,
        isNewCustomer: pickBoolean(comment, ["isNewCustomer"]) ?? undefined,
      });

      applyAuthResponses([response.response], patchSession, logout);

      if (response.ok) {
        showToast(`Đã tạo đơn cho ${igUsername || "khách hàng"}`);
        queryClient.invalidateQueries({ queryKey: ["live_orders"] });

        // Trigger print
        triggerCommentPrint(comment, actionType);
      } else {
        showToast("Tạo đơn thất bại", "error");
      }
    } catch {
      showToast("Lỗi khi tạo đơn", "error");
    } finally {
      setCommentLoading(commentId, false);
    }
  };

  // ═══════════════════════════════════════════
  // ACTION: Dự bị (BACKUP)
  // ═══════════════════════════════════════════

  const handleBackup = async (comment: Record<string, unknown>) => {
    const commentId = pickString(comment, ["id", "_id", "commentId"]);
    if (!commentId || !session.accessToken) return;

    setCommentLoading(commentId, true);
    try {
      const response = await linkBackup(session, commentId);
      applyAuthResponses([response.response], patchSession, logout);

      if (response.ok) {
        showToast("Đã gắn dự bị");
        queryClient.invalidateQueries({ queryKey: ["live_orders"] });
      } else {
        showToast("Không thể gắn dự bị", "error");
      }
    } catch {
      showToast("Lỗi khi gắn dự bị", "error");
    } finally {
      setCommentLoading(commentId, false);
    }
  };

  // ═══════════════════════════════════════════
  // ACTION: Huỷ dự bị (BACKUP → null)
  // ═══════════════════════════════════════════

  const handleUnlinkBackup = async (comment: Record<string, unknown>) => {
    const commentId = pickString(comment, ["id", "_id", "commentId"]);
    if (!commentId || !session.accessToken) return;

    setCommentLoading(commentId, true);
    try {
      const response = await unlinkBackup(session, commentId);
      applyAuthResponses([response.response], patchSession, logout);

      if (response.ok) {
        showToast("Đã huỷ dự bị");
        queryClient.invalidateQueries({ queryKey: ["live_orders"] });
      } else {
        showToast("Không thể huỷ dự bị", "error");
      }
    } catch {
      showToast("Lỗi khi huỷ dự bị", "error");
    } finally {
      setCommentLoading(commentId, false);
    }
  };

  // ═══════════════════════════════════════════
  // ACTION: Huỷ chốt (NORMAL/CONFIRMED_ERROR → null)
  // ═══════════════════════════════════════════

  const handleCancelOrder = async (comment: Record<string, unknown>) => {
    setCommentToCancel(comment);
    setConfirmCancelOpen(true);
  };

  const confirmCancelOrder = async () => {
    const comment = commentToCancel;
    if (!comment || !session.accessToken) return;

    const commentId = pickString(comment, ["id", "_id", "commentId"]);
    const status = pickString(comment, ["status"]);
    if (!commentId) return;

    setConfirmCancelOpen(false);
    setCommentLoading(commentId, true);
    try {
      let success = false;

      if (status === "BACKUP") {
        const response = await unlinkBackup(session, commentId);
        applyAuthResponses([response.response], patchSession, logout);
        if (response.ok) success = true;
      } else {
        const { removeCommentFromOrder } = await import("@/lib/services/orders-service");
        const res = await removeCommentFromOrder(session, commentId);
        applyAuthResponses([res.response], patchSession, logout);
        if (res.ok) success = true;
      }

      if (success) {
        showToast("Đã huỷ chốt");
        queryClient.invalidateQueries({ queryKey: ["live_orders"] });
      } else {
        showToast("Không thể huỷ chốt", "error");
      }
    } catch {
      showToast("Lỗi khi huỷ chốt", "error");
    } finally {
      setCommentLoading(commentId, false);
    }
  };

  // ═══════════════════════════════════════════
  // ACTION: In thêm (quantity + 1 → in lại)
  // ═══════════════════════════════════════════

  const handlePrintMore = async (comment: Record<string, unknown>) => {
    const commentId = pickString(comment, ["id", "_id", "commentId"]);
    if (!commentId || !session.accessToken) return;

    const currentQuantity = pickNumber(comment, ["quantity"]) ?? 1;
    const newQuantity = currentQuantity + 1;

    setCommentLoading(commentId, true);
    try {
      const response = await updateComment(session, commentId, {
        quantity: newQuantity,
        liveId,
      });
      applyAuthResponses([response.response], patchSession, logout);

      if (response.ok) {
        showToast(`Đã cập nhật số lượng: ${newQuantity}`);
        queryClient.invalidateQueries({ queryKey: ["live_orders"] });

        // Trigger print with updated qty
        const updatedComment = { ...comment, quantity: newQuantity };
        const status = pickString(comment, ["status"]);
        triggerCommentPrint(
          updatedComment,
          status === "CONFIRMED_ERROR" ? "CONFIRMED_ERROR" : "NORMAL"
        );
      } else {
        showToast("Không thể cập nhật số lượng", "error");
      }
    } catch {
      showToast("Lỗi khi in thêm", "error");
    } finally {
      setCommentLoading(commentId, false);
    }
  };

  // ═══════════════════════════════════════════
  // TAG SAVE
  // ═══════════════════════════════════════════

  const saveCustomerTags = async (customerId: string, tagIds: string[]) => {
    if (!session.accessToken || !customerId || tagIds.length === 0) return;
    try {
      const { proxyRequest } = await import("@/lib/proxy-client");
      await proxyRequest(session, {
        path: `/customers/${customerId}/tags`,
        method: "POST",
        body: { tagIds },
      });
    } catch { /* ignore */ }
  };

  // ═══════════════════════════════════════════
  // RENDER COMMENT ITEM
  // ═══════════════════════════════════════════

  const ItemContent = (index: number, comment: Record<string, unknown>) => {
    const status = pickString(comment, ["status"]);
    const isError = status === "CONFIRMED_ERROR";
    const isSuccess = status === "SUCCESS";
    const isNormal = status === "NORMAL";
    const isBackup = status === "BACKUP";
    const isNullStatus = !status;
    const isSystemInfo = pickString(comment, ["type"]) === "SYSTEM";
    const customerId = pickString(comment, ["customerId", "customer_id"]);
    const isNewCustomer = pickBoolean(comment, ["isNewCustomer"]) ?? undefined;
    const commentId = pickString(comment, ["id", "_id", "commentId"]);
    const isLoading = loadingComments.has(commentId);
    const quantity = pickNumber(comment, ["quantity"]) ?? 1;

    if (isSystemInfo) {
      return (
        <div className="px-4 py-1.5 flex justify-center">
          <span className="bg-[var(--surface-muted)]/50 border border-[var(--border)] rounded-full px-4 py-1 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">{pickString(comment, ["text", "content"])}</span>
        </div>
      );
    }

    return (
      <div className={`group relative px-4 py-3 hover:bg-[var(--surface-muted)]/30 border-b border-[var(--border)] ${isError ? 'bg-red-50/10' : ''} transition-colors`}>
        <div className="flex flex-col gap-2 w-full">
          {/* Hàng 1: Avatar căn giữa với Tên và Nội dung */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-11 flex flex-col items-center">
              <div className="h-8 w-8 overflow-hidden rounded-full ring-2 ring-[var(--surface)] shadow-sm bg-[color:var(--primary-soft)] flex items-center justify-center text-[var(--primary)] shrink-0 transition-transform group-hover:scale-110">
                 <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
            </div>
            
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center gap-2 mb-0.5 pr-2">
                <div className={`flex items-center flex-wrap gap-1.5 text-xs font-bold ${isError ? 'text-red-500' : 'text-[var(--foreground)]'}`}>
                  <span className="truncate max-w-[120px] leading-tight">{pickString(comment, ["igUsername", "username"]) || "Instagram User"}</span>

                  {pickString(comment, ["customerPhone"]) && (
                    <span title={`SĐT: ${pickString(comment, ["customerPhone"])}`} className="text-emerald-600 bg-emerald-50 p-0.5 rounded-full shrink-0 inline-flex items-center justify-center">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </span>
                  )}
                  {(pickString(comment, ["customerProvince"]) || pickString(comment, ["customerStreet"])) && (
                    <span title={`Địa chỉ: ${[pickString(comment, ["customerStreet"]), pickString(comment, ["customerWard"]), pickString(comment, ["customerProvince"])].filter(Boolean).join(', ')}`} className="text-rose-500 bg-rose-50 p-0.5 rounded-full shrink-0 inline-flex items-center justify-center">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </span>
                  )}

                  {isNewCustomer && <span className="inline-flex items-center px-1 rounded bg-green-100 text-green-700 text-[9px] uppercase tracking-wider shrink-0" title="Khách hàng mới">mới</span>}
                  {isBackup && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] uppercase font-bold tracking-wider shrink-0">Dự bị</span>}
                  {isError && <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] uppercase font-bold tracking-wider shrink-0">Đã báo lỗi</span>}
                </div>
                {customerId && <CustomerTagDropdown tags={tags} customerId={customerId} customerName={pickString(comment, ["igUsername", "username"]) || "Khách hàng"} isNewCustomer={isNewCustomer} onSave={(tagIds) => saveCustomerTags(customerId, tagIds)} />}

                <div className="flex-1"></div>

                <span className="text-[10px] text-[var(--muted)] font-medium shrink-0">
                  {pickString(comment, ["createdAt", "created_at"]) ? new Date(pickString(comment, ["createdAt", "created_at"]) as string).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                </span>
              </div>
              <p className={`text-sm leading-tight whitespace-pre-wrap break-words ${isError ? 'text-red-600/80' : 'text-[var(--foreground-soft)]'}`}>{pickString(comment, ["text", "content"])}</p>
            </div>
          </div>

          {/* Hàng 2: Biểu tượng SL căn giữa với thanh nút bấm */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-11 flex justify-center">
              {pickString(comment, ["igUserId", "ig_user_id"]) && (
                <CustomerClosedItemsDropdown
                  customerId={customerId}
                  igUserId={pickString(comment, ["igUserId", "ig_user_id"])!}
                  customerClosedCount={pickNumber(comment, ["customerClosedCount", "customer_closed_count"]) || 0}
                  allComments={allComments}
                  onCancelOrder={handleCancelOrder}
                  loadingComments={loadingComments}
                  onFilterCustomer={onFilterCustomer}
                />
              )}
            </div>
            
            <div className="flex-1 flex flex-wrap items-center gap-2">
              {/* ── STATUS === null: Chốt đơn, Đã báo lỗi, Dự bị ── */}
              {isNullStatus && (
                <>
                  <button
                    onClick={() => handleConfirmOrder(comment, "NORMAL")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-strong)] transition active:scale-95 shrink-0 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    )}
                    Chốt đơn
                  </button>
                  <button
                    onClick={() => handleConfirmOrder(comment, "CONFIRMED_ERROR")}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-md border border-amber-300 !bg-white px-2.5 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50 transition active:scale-95 shrink-0 disabled:opacity-50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Đã báo lỗi
                  </button>
                  <button
                    onClick={() => handleBackup(comment)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-95 shrink-0 disabled:opacity-50"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Dự bị
                  </button>
                </>
              )}

              {/* ── STATUS === NORMAL: Huỷ chốt, In thêm ── */}
              {isNormal && (
                <>
                  <button
                    onClick={() => handleCancelOrder(comment)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-600 shadow-sm hover:bg-red-100 transition active:scale-95 shrink-0 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    Huỷ chốt
                  </button>
                  <button
                    onClick={() => handlePrintMore(comment)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-md bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-orange-600 transition active:scale-95 shrink-0 disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    In thêm{quantity > 1 ? ` (${quantity})` : ""}
                  </button>
                </>
              )}

              {/* ── STATUS === BACKUP: Huỷ dự bị ── */}
              {isBackup && (
                <button
                  onClick={() => handleUnlinkBackup(comment)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-600 shadow-sm hover:bg-red-100 transition active:scale-95 shrink-0 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  Huỷ dự bị
                </button>
              )}

              {/* ── STATUS === CONFIRMED_ERROR: Huỷ chốt, In thêm ── */}
              {isError && (
                <>
                  <button
                    onClick={() => handleCancelOrder(comment)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-600 shadow-sm hover:bg-red-100 transition active:scale-95 shrink-0 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    Huỷ chốt
                  </button>
                  <button
                    onClick={() => handlePrintMore(comment)}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 rounded-md bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-orange-600 transition active:scale-95 shrink-0 disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    In thêm{quantity > 1 ? ` (${quantity})` : ""}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {isSuccess && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-50 text-green-500 ring-1 ring-inset ring-green-500/20"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg></span>
          </div>
        )}
      </div>
    );
  };

  const fetchMoreCommentsHandler = () => { fetchMoreComments() };
  const firstItemIndex = 1000000;

  return (
    <div className="flex h-full flex-col relative bg-[var(--surface)] w-full overflow-hidden">
      <div className="flex flex-col border-b border-[var(--border)] shrink-0 bg-[var(--surface)]/95 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Luồng bình luận</h3>
            {(hookLiveStats.totalComment > 0 || stats.totalComment > 0) && (
              <span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--surface-muted)] rounded-full px-2 py-0.5 shadow-sm" title="Tổng số bình luận">
                {formatNumber(Math.max(hookLiveStats.totalComment, stats.totalComment))} bình luận
              </span>
            )}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${sseStatus === "live" ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20" : sseStatus === "connecting" ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20" : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"}`}>
              {sseStatus === "live" && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>}
              {sseStatus === "connecting" && <svg className="h-2.5 w-2.5 mr-1 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
              {sseStatus === "live" ? "Live" : sseStatus === "connecting" ? "Đang nối..." : "Mất mạng"}
            </span>
          </div>
          <button onClick={() => useSettingsStore.getState().setCommentDisplayOrder(isNewestAtBottom ? "newest_at_top" : "newest_at_bottom")} className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] bg-[var(--surface-muted)] px-2.5 py-1 rounded-full transition-all border border-[var(--border)]">
            <svg className={`h-4 w-4 transition-transform duration-300 ${isNewestAtBottom ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
            {!isNewestAtBottom ? "Mới nhất ở trên" : "Mới nhất ở dưới"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-[var(--surface-muted)]/10">
        {displayComments.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Đang chờ bình luận mới...</div>
        ) : (
          <Virtuoso
            key={`${liveId}-${commentDisplayOrder}`}
            ref={virtuosoRef}
            data={displayComments}
            className="h-full custom-scrollbar"
            atBottomStateChange={setAtBottom}
            atTopStateChange={setAtTop}
            itemContent={ItemContent}
            firstItemIndex={firstItemIndex}
            startReached={isNewestAtBottom && !isLoadingMore && hasMore ? fetchMoreCommentsHandler : undefined}
            endReached={!isNewestAtBottom && !isLoadingMore && hasMore ? fetchMoreCommentsHandler : undefined}
            initialTopMostItemIndex={isNewestAtBottom ? displayComments.length - 1 : 0}
            followOutput={isNewestAtBottom ? (isAtBottom => isAtBottom ? 'smooth' : false) : false}
            components={{
              Header: () => isNewestAtBottom ? (
                <div className="py-3 text-center mb-2">
                  {!hasMore ? <span className="text-[10px] text-[var(--muted)] font-medium italic block py-1 bg-[var(--surface-muted)]/50 rounded">--- Đã tải hết lịch sử ---</span>
                    : isLoadingMore ? <span className="text-[10px] font-bold text-[var(--primary)] animate-pulse">Đang tải...</span>
                      : <button onClick={fetchMoreCommentsHandler} className="text-[10px] text-[var(--muted)] opacity-60 hover:text-[var(--primary)] hover:opacity-100 transition-colors">↑ Tải thêm</button>}
                </div>
              ) : null,
              Footer: () => !isNewestAtBottom ? (
                <div className="py-3 text-center mt-2">
                  {!hasMore ? <span className="text-[10px] text-[var(--muted)] font-medium italic block py-1 bg-[var(--surface-muted)]/50 rounded">--- Đã tải hết lịch sử ---</span>
                    : isLoadingMore ? <span className="text-[10px] font-bold text-[var(--primary)] animate-pulse">Đang tải...</span>
                      : <button onClick={fetchMoreCommentsHandler} className="text-[10px] text-[var(--muted)] opacity-60 hover:text-[var(--primary)] hover:opacity-100 transition-colors">↓ Tải thêm</button>}
                </div>
              ) : <div className="h-4" />
            }}
          />
        )}

        {(!isNewestAtBottom ? !atTop : !atBottom) && displayComments.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={() => { const behavior = 'smooth'; isNewestAtBottom ? virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior }) : virtuosoRef.current?.scrollToIndex({ index: 0, behavior }); }}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-xs font-bold text-[var(--foreground)] shadow-lg"
            >
              <svg className={`h-4 w-4 text-[var(--primary)] ${isNewestAtBottom ? 'animate-bounce' : 'rotate-180 animate-bounce'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              Theo dõi Luồng mới
            </button>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && createPortal(<Toast message={toast.message} type={toast.type} />, document.body)}

      {/* Custom Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmCancelOpen}
        title="Xác nhận huỷ chốt"
        message={
          <div className="space-y-3">
             <p>Bạn có chắc chắn muốn huỷ chốt món này không? Hành động này không thể hoàn tác.</p>
             <div className="rounded-xl bg-[var(--surface-muted)]/50 p-3 border border-[var(--border)] space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--primary)]">{pickString(commentToCancel, ["igUsername", "username"]) || "Khách hàng"}</span>
                    <span className="text-[10px] text-[var(--muted)]">
                        {pickString(commentToCancel, ["createdAt", "created_at"]) ? new Date(pickString(commentToCancel, ["createdAt", "created_at"]) as string).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                    </span>
                </div>
                <p className="text-xs text-[var(--foreground-soft)] italic">"{pickString(commentToCancel, ["text", "content"])}"</p>
             </div>
          </div>
        }
        confirmLabel="Huỷ chốt ngay"
        cancelLabel="Quay lại"
        isDanger={true}
        onConfirm={confirmCancelOrder}
        onCancel={() => setConfirmCancelOpen(false)}
      />
    </div>
  );
}
