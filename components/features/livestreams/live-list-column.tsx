"use client";

import React, { useState, useDeferredValue, useEffect } from "react";
import { useSession } from "@/components/session-provider";
import { useQueryClient } from "@tanstack/react-query";
import { useLives } from "@/hooks/use-lives";
import { detectLive } from "@/lib/services/lives-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { asRecord, extractCollection, pickString, pickBoolean, pickNumber, formatNumber } from "@/lib/proxy-client";
import type { LiveStats } from "@/hooks/use-comments";

import {
  LoadingState,
  ErrorState,
  EmptyState,
  CONTROL_CLASS,
  formatLiveDateTime,
} from "@/components/ui/workspace-shared";

export function LiveListColumn({ 
  activeLiveId, 
  onSelectLive, 
  liveStats 
}: { 
  activeLiveId: string | null; 
  onSelectLive: (id: string) => void; 
  liveStats: LiveStats 
}) {
  const { session } = useSession();
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [detecting, setDetecting] = useState(false);
  const queryClient = useQueryClient();

  const { data, status, error: queryError } = useLives(search);

  const state = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data || null,
    error: queryError ? queryError.message : "",
  }

  const livestreams = extractCollection(state.data).map((live) => ({
    id: pickString(live, ["id", "_id"]) || pickString(live, ["igLiveId"]),
    title: pickString(asRecord(live.shop), ["name"]) || pickString(live, ["igLiveId"]) || "Livestream",
    isLive: pickBoolean(live, ["isLive"]) ?? false,
    comments: pickNumber(live, ["totalComment", "totalComments"]) ?? 0,
    orders: pickNumber(live, ["totalOrder", "totalOrders"]) ?? 0,
    updatedAt: pickString(live, ["lastWebhookAt", "updatedAt", "createdAt"]),
    owner: pickString(asRecord(live.user), ["fullName", "name"]) || session.user?.fullName || "Owner",
    igLiveId: pickString(live, ["igLiveId"]) || "instagram-live",
    shopId: pickString(live, ["shopId"]) || pickString(asRecord(live.shop), ["id", "_id"]),
  }));

  useEffect(() => {
    if (livestreams.length > 0 && !activeLiveId && !query) {
      onSelectLive(livestreams[0].id || "");
    }
  }, [livestreams, activeLiveId, onSelectLive, query]);

  const handleDetectLive = async () => {
    const firstShopId = livestreams[0]?.shopId;
    if (!firstShopId || detecting) return;
    setDetecting(true);
    try {
      const res = await detectLive(session, firstShopId);
      applyAuthResponses([res.response], () => {}, async () => {});
      queryClient.invalidateQueries({ queryKey: ["livestreams"] });
    } catch { /* ignore */ }
    setDetecting(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] px-4 py-3 shrink-0">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Phiên Live của bạn</h2>
          <button
            onClick={handleDetectLive}
            disabled={detecting}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-all disabled:opacity-50"
            title="Nhận diện Live stream"
          >
            <svg className={`h-3.5 w-3.5 ${detecting ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo mã, nội dung..."
            className={`${CONTROL_CLASS} w-full pl-9`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {state.status === "loading" ? <LoadingState compact /> : null}
        {state.status === "error" ? <ErrorState message={state.error} compact /> : null}
        {state.status === "ready" && livestreams.length === 0 ? (
          <EmptyState message="Không tìm thấy livestream nào." compact />
        ) : null}

        <div className="space-y-1">
          {livestreams.map((live) => {
            const isActive = activeLiveId === live.id;
            const displayComments = isActive && liveStats.totalComment > 0 ? liveStats.totalComment : live.comments;
            const displayOrders = isActive && liveStats.totalOrder > 0 ? liveStats.totalOrder : live.orders;
            return (
              <button
                key={live.id}
                onClick={() => { if (live.id) onSelectLive(live.id) }}
                className={`w-full text-left rounded-lg p-3 transition border ${isActive
                  ? "bg-[color:var(--primary-soft)] border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent bg-transparent hover:bg-[var(--surface-muted)] text-[var(--foreground)]"
                  }`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${live.isLive ? 'bg-red-50 text-red-700' : 'bg-[var(--surface-muted)] text-[var(--muted)]'}`}>
                    {live.isLive && <span className="h-1.5 w-1.5 rounded-full animate-[pulse_2s_ease-in-out_infinite] bg-red-500"></span>}
                    {live.isLive ? "Đang Live" : "Đã Kết Thúc"}
                  </span>
                </div>
                <p className={`mb-2.5 truncate text-sm font-bold ${isActive ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
                  {formatLiveDateTime(live.updatedAt || "")}
                </p>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <strong className={isActive ? "text-[var(--primary)]" : "text-[var(--foreground)]"}>{formatNumber(displayComments)}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    <strong className={isActive ? "text-[var(--primary)]" : "text-[var(--foreground)]"}>{formatNumber(displayOrders)}</strong>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
