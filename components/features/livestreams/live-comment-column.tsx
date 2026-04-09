"use client";

import React, { useState, useEffect, useRef, startTransition, useCallback } from "react";
import { useSession } from "@/components/session-provider";
import { useQueryClient } from "@tanstack/react-query";
import { useCommentsStream, type LiveStats } from "@/hooks/use-comments";
import { useSettingsStore } from "@/stores/settings-store";
import { streamProxyRequest } from "@/lib/proxy-client";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { asRecord, pickString, pickNumber, pickBoolean } from "@/lib/proxy-client";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

import {
  LoadingState,
  ErrorState,
  EmptyState,
  formatNumber,
  safelyParseEvent
} from "@/components/ui/workspace-shared";

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

export function LiveCommentColumn({ liveId, onLiveStatsUpdate }: { liveId: string; onLiveStatsUpdate?: (stats: LiveStats) => void }) {
  const { session, patchSession, logout } = useSession();
  const queryClient = useQueryClient();
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const commentDisplayOrder = useSettingsStore(state => state.commentDisplayOrder);
  const autoReconnectSSE = useSettingsStore(state => state.autoReconnectSSE);
  const isNewestAtBottom = commentDisplayOrder === "newest_at_bottom";
  const [atBottom, setAtBottom] = useState(true);
  const [atTop, setAtTop] = useState(true);

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
      if (!liveId || !session.accessToken) return () => {};
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
          if (event.event === "stats_updated") {
            setStats(prev => {
              const newStats = {
                totalOrder: pickNumber(asRecord(payload), ["totalOrder"]) ?? prev.totalOrder,
                totalComment: pickNumber(asRecord(payload), ["totalComment"]) ?? prev.totalComment,
                totalItems: pickNumber(asRecord(payload), ["totalItems"]) ?? prev.totalItems,
              };
              if (onLiveStatsUpdateRef.current) onLiveStatsUpdateRef.current(newStats);
              return newStats;
            });
          } else if (event.event === "comment_created") {
            const nextComment = asRecord(payload);
            if (Object.keys(nextComment).length > 0) {
              setRealtimeComments(current => {
                const newCurrent = [...current, nextComment];
                return newCurrent.length > 500 ? newCurrent.slice(newCurrent.length - 500) : newCurrent;
              });
              const keyStr = pickString(nextComment, ["id", "_id", "commentId"]) || "";
              if (keyStr) queryClient.invalidateQueries({ queryKey: ["live_orders"] });
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

  const handleManualAction = async (commentId: string, actionType: "print" | "close" | "delete" | "cancel" | "unbackup") => {
    if (!commentId || !session.accessToken) return;
    try {
      const response = await fetch(`/api/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/comments/${commentId}/action`,
          method: "POST",
          headers: { "Authorization": `Bearer ${session.accessToken}` },
          body: { action: actionType },
        }),
      });
      if (response.ok) queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    } catch { /* ignore */ }
  };

  const saveCustomerTags = async (customerId: string, tagIds: string[]) => {
    if (!session.accessToken || !customerId || tagIds.length === 0) return;
    try {
      await fetch(`/api/proxy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/customers/${customerId}/tags`,
          method: "POST",
          headers: { "Authorization": `Bearer ${session.accessToken}` },
          body: { tagIds },
        }),
      });
    } catch { /* ignore */ }
  };

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

    if (isSystemInfo) {
      return (
        <div className="px-4 py-1.5 flex justify-center">
          <span className="bg-[var(--surface-muted)]/50 border border-[var(--border)] rounded-full px-4 py-1 text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">{pickString(comment, ["text", "content"])}</span>
        </div>
      );
    }

    return (
      <div className={`group relative px-4 py-2 hover:bg-[var(--surface-muted)]/30 border-b border-[var(--border)] ${isError ? 'bg-red-50/10' : ''} transition-colors`}>
         <div className="flex items-start gap-3 w-full">
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--surface)] shadow-sm bg-[color:var(--primary-soft)] flex items-center justify-center text-[var(--primary)] font-bold text-xs">
              {(pickString(comment, ["igUsername", "username"]) || "U")[0]?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
               <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-bold truncate ${isError ? 'text-red-500' : 'text-[var(--foreground)]'}`}>
                     {pickString(comment, ["igUsername", "username"]) || "Instagram User"}
                     {isNewCustomer && <span className="ml-1.5 inline-block px-1 rounded bg-green-100 text-green-700 text-[9px] uppercase tracking-wider align-middle" title="Khách hàng mới" style={{ marginTop: '-2px' }}>mới</span>}
                     {isBackup && <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 text-[9px] uppercase font-bold tracking-wider align-middle" style={{ marginTop: '-2px' }}>Dự bị</span>}
                     {isError && <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[9px] uppercase font-bold tracking-wider align-middle" style={{ marginTop: '-2px' }}>Đã báo lỗi</span>}
                  </span>
                  {customerId && <CustomerTagDropdown tags={tags} customerId={customerId} customerName={pickString(comment, ["igUsername", "username"]) || "Khách hàng"} isNewCustomer={isNewCustomer} onSave={(tagIds) => saveCustomerTags(customerId, tagIds)} />}
               </div>
               <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isError ? 'text-red-600/80' : 'text-[var(--foreground-soft)]'}`}>{pickString(comment, ["text", "content"])}</p>
               <div className="flex items-center gap-2 pt-2">
                 {isNullStatus && (
                   <>
                     <button onClick={() => handleManualAction(pickString(comment, ["id", "_id", "commentId"]) || "", "print")} className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-strong)] transition active:scale-95 shrink-0">
                       <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                       Chốt đơn
                     </button>
                     <button onClick={() => handleManualAction(pickString(comment, ["id", "_id", "commentId"]) || "", "close")} className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-95 shrink-0">
                       <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       Đã báo lỗi
                     </button>
                     <button onClick={() => handleManualAction(pickString(comment, ["id", "_id", "commentId"]) || "", "delete")} className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-95 shrink-0">
                       <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       Dự bị
                     </button>
                   </>
                 )}
                 {isNormal && (
                   <>
                     <button onClick={() => handleManualAction(pickString(comment, ["id", "_id", "commentId"]) || "", "cancel")} className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-95 shrink-0">
                       <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                       Huỷ chốt
                     </button>
                     <button onClick={() => handleManualAction(pickString(comment, ["id", "_id", "commentId"]) || "", "print")} className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-strong)] transition active:scale-95 shrink-0">
                       <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                       In thêm
                     </button>
                   </>
                 )}
                 {isBackup && (
                   <button onClick={() => handleManualAction(pickString(comment, ["id", "_id", "commentId"]) || "", "unbackup")} className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-95 shrink-0">
                     <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                     Huỷ dự bị
                   </button>
                 )}
                 {isError && (
                   <>
                     <button onClick={() => handleManualAction(pickString(comment, ["id", "_id", "commentId"]) || "", "cancel")} className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-95 shrink-0">
                       <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                       Huỷ chốt
                     </button>
                     <button onClick={() => handleManualAction(pickString(comment, ["id", "_id", "commentId"]) || "", "close")} className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-95 shrink-0">
                       <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                       In thêm
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
    </div>
  );
}
