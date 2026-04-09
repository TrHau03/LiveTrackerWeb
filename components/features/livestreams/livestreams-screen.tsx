"use client";

import React, { useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import type { LiveStats } from "@/hooks/use-comments";

import { LiveListColumn } from "./live-list-column";
import { LiveCommentColumn } from "./live-comment-column";
import { LiveOrderColumn } from "./live-order-column";

export function LivestreamsScreen() {
  const activeLiveId = useSettingsStore(state => state.activeLiveId);
  const setActiveLiveId = useSettingsStore(state => state.setActiveLiveId);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [liveStats, setLiveStats] = useState<LiveStats>({ totalOrder: 0, totalComment: 0, totalItems: 0 });

  const handleSelectLive = (id: string) => {
    setActiveLiveId(id);
    setMobileView("detail");
    setLiveStats({ totalOrder: 0, totalComment: 0, totalItems: 0 });
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden pb-4">
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
        <div className={`flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] transition-all duration-300 ${mobileView === "list" ? "w-full lg:w-[25%]" : "hidden lg:flex lg:w-[25%]"}`}>
          <LiveListColumn activeLiveId={activeLiveId} onSelectLive={handleSelectLive} liveStats={liveStats} />
        </div>

        <div className={`flex-1 flex min-h-0 gap-4 overflow-hidden transition-all duration-300 ${mobileView === "detail" ? "w-full flex-col lg:flex-row" : "hidden lg:flex"}`}>
          <div className="flex flex-col flex-[1.5] min-h-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden">
            {activeLiveId ? (
              <div className="flex flex-col h-full">
                <div className="lg:hidden p-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/30">
                  <button onClick={() => setMobileView("list")} className="flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    Quay lại danh sách
                  </button>
                </div>
                <LiveCommentColumn liveId={activeLiveId} onLiveStatsUpdate={setLiveStats} />
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-[var(--surface-muted)]/20 p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-muted)] shadow-inner text-[var(--muted)]">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <p className="text-base font-semibold text-[var(--foreground)]">Chưa chọn Livestream</p>
                <p className="mt-2 max-w-[250px] text-sm text-[var(--muted)]">Vui lòng chọn một phiên live từ danh sách bên trái để bắt đầu theo dõi bình luận realtime.</p>
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] relative overflow-hidden h-[400px] lg:h-full">
            {activeLiveId ? (
              <LiveOrderColumn key={activeLiveId} liveId={activeLiveId} liveStats={liveStats} />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-[var(--surface-muted)]/20 p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-muted)] shadow-inner text-[var(--muted)]">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                </div>
                <p className="text-base font-semibold text-[var(--foreground)]">Chưa có dữ liệu đơn hàng</p>
                <p className="mt-2 max-w-[250px] text-sm text-[var(--muted)]">Chọn livestream để quản lý danh sách đơn hàng đã chốt từ phiên live.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
