"use client";

import React, { useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useHeaderStore } from "@/lib/store/header-store";
import type { LiveStats } from "@/hooks/use-comments";
import { useSession } from "@/components/session-provider";
import { proxyRequest, extractApiData } from "@/lib/proxy-client";
import { ChatPanel } from "../messenger/chat-panel";

import { LiveListColumn } from "./live-list-column";
import { LiveCommentColumn } from "./live-comment-column";
import { LiveOrderColumn } from "./live-order-column";

export function LivestreamsScreen() {
  const activeLiveId = useSettingsStore(state => state.activeLiveId);
  const setActiveLiveId = useSettingsStore(state => state.setActiveLiveId);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [liveStats, setLiveStats] = useState<LiveStats>({ totalOrder: 0, totalComment: 0, totalItems: 0 });
  const [filterQuery, setFilterQuery] = useState("");
  const { session } = useSession();
  const [quickChatUsername, setQuickChatUsername] = useState<string | null>(null);
  const [quickConversation, setQuickConversation] = useState<any | null>(null);
  const [isFetchingQuickConv, setIsFetchingQuickConv] = useState(false);

  const setHeader = useHeaderStore(state => state.setHeader);
  const resetHeader = useHeaderStore(state => state.resetHeader);

  React.useEffect(() => {
    setHeader({
      title: "Phiên Live",
      subtitle: "Theo dõi và chốt đơn thời gian thực",
      showDateRange: false,
    });
    return () => resetHeader();
  }, [setHeader, resetHeader]);

  const handleStartQuickChat = async (username: string) => {
    if (!username) return;
    setQuickChatUsername(username);
    setIsFetchingQuickConv(true);
    setQuickConversation(null);

    try {
      const response = await proxyRequest(session, {
        path: "/messenger/conversations",
        method: "GET",
        query: { limit: 1, search: username },
      });
      
      const page = extractApiData<any>(response.data);
      const conversation = page?.items?.[0] || null;
      setQuickConversation(conversation);
    } catch (error) {
      console.error("Failed to find conversation for quick chat", error);
    } finally {
      setIsFetchingQuickConv(false);
    }
  };

  const handleSelectLive = (id: string) => {
    setActiveLiveId(id);
    setMobileView("detail");
    setLiveStats({ totalOrder: 0, totalComment: 0, totalItems: 0 });
    setQuickChatUsername(null);
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden pb-4">
      <div className="flex flex-1 min-h-0 gap-2 overflow-hidden">
        <div className={`flex flex-col border border-[var(--border)] bg-[var(--surface)] rounded-lg transition-all duration-200 ${mobileView === "list" ? "w-full lg:w-[25%]" : "hidden lg:flex lg:w-[25%]"}`}>
          <LiveListColumn activeLiveId={activeLiveId} onSelectLive={handleSelectLive} liveStats={liveStats} />
        </div>

        <div className={`flex-1 flex min-h-0 gap-2 overflow-hidden transition-all duration-300 ${mobileView === "detail" ? "w-full flex-col lg:flex-row" : "hidden lg:flex"}`}>
          <div className="flex flex-col flex-[1.5] min-h-0 border border-[var(--border)] bg-[var(--surface)] rounded-lg overflow-hidden">
            {activeLiveId ? (
              <div className="flex flex-col h-full">
                <div className="lg:hidden p-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/30">
                  <button onClick={() => setMobileView("list")} className="flex items-center gap-2 text-sm font-medium text-[var(--primary)]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    Quay lại danh sách
                  </button>
                </div>
                <LiveCommentColumn 
                  liveId={activeLiveId} 
                  onLiveStatsUpdate={setLiveStats} 
                  onFilterCustomer={setFilterQuery}
                  onStartQuickChat={handleStartQuickChat}
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center bg-[var(--surface-muted)]/20 p-8 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <p className="text-sm font-medium text-[var(--foreground)]">Chưa chọn Livestream</p>
                <p className="mt-2 max-w-[250px] text-sm text-[var(--muted)]">Vui lòng chọn một phiên live từ danh sách bên trái để bắt đầu theo dõi bình luận realtime.</p>
              </div>
            )}
          </div>
 
          <div className="flex flex-col flex-1 min-h-0 border border-[var(--border)] bg-[var(--surface)] rounded-lg relative overflow-hidden h-[400px] lg:h-full">
            {/* Cột đơn hàng có hiệu ứng trượt trơn tru */}
            <div
              className={`w-full h-full flex flex-col transition-all duration-300 ease-out ${
                quickChatUsername
                  ? "opacity-0 pointer-events-none translate-x-[-50px]"
                  : "opacity-100 translate-x-0"
              }`}
            >
              {activeLiveId ? (
                <LiveOrderColumn 
                  key={activeLiveId} 
                  liveId={activeLiveId} 
                  liveStats={liveStats}
                  filterQuery={filterQuery}
                  onFilterChange={setFilterQuery}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center bg-[var(--surface-muted)]/20 p-8 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--muted)]">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  </div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Chưa có dữ liệu đơn hàng</p>
                  <p className="mt-2 max-w-[250px] text-sm text-[var(--muted)]">Chọn livestream để quản lý danh sách đơn hàng đã chốt từ phiên live.</p>
                </div>
              )}
            </div>

            {/* Quick Chat Overlay Panel trượt từ bên phải đè lên */}
            <div
              className={`absolute inset-0 bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden flex flex-col transition-all duration-300 ease-out z-10 shadow-[var(--shadow-medium)] ${
                quickChatUsername
                  ? "opacity-100 translate-x-0 pointer-events-auto"
                  : "opacity-0 pointer-events-none translate-x-[100%]"
              }`}
            >
              {/* Quick Chat Header */}
              <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-muted)] shrink-0">
                <button
                  type="button"
                  onClick={() => setQuickChatUsername(null)}
                  className="h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--hover)] flex items-center justify-center text-[var(--foreground)] transition-colors"
                  title="Quay lại"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-[var(--foreground)] truncate">
                    Trò chuyện nhanh: @{quickChatUsername}
                  </h4>
                  <p className="text-[11px] text-[var(--muted)]">Instagram Chat</p>
                </div>
              </div>

              {/* Quick Chat Content wrapper */}
              <div className="flex-1 min-h-0 relative flex flex-col">
                {isFetchingQuickConv ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6">
                    <span className="live-detail-spinner" />
                    <span className="text-xs text-[var(--muted)]">Đang tải cuộc trò chuyện...</span>
                  </div>
                ) : !quickConversation ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-3">
                    <div className="h-12 w-12 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center text-[var(--muted)]">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                      </svg>
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--foreground)]">Không tìm thấy hội thoại</h5>
                      <p className="text-xs text-[var(--muted)] mt-1 max-w-[240px] mx-auto">
                        Chưa có hội thoại nào được đồng bộ của người dùng @{quickChatUsername} trên hệ thống.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 flex flex-col bg-[var(--surface)]">
                    <ChatPanel conversation={quickConversation} />
                  </div>
                )}
              </div>
            </div>

            <style jsx>{`
              .live-detail-spinner {
                width: 24px;
                height: 24px;
                border: 2px solid var(--border);
                border-top-color: var(--primary);
                border-radius: 50%;
                animation: spin 600ms linear infinite;
              }
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
}
