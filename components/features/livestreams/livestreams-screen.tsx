"use client";

import React, { useState } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import { useSearchParams } from "next/navigation";
import { useHeaderStore } from "@/stores/header-store";
import type { LiveStats } from "@/hooks/use-comments";
import { useSession } from "@/components/session-provider";
import { proxyRequest, extractApiData } from "@/lib/proxy-client";
import { ChatPanel } from "../messenger/chat-panel";
import { AlertTriangle, Printer, RefreshCw, AlertCircle, ChevronDown } from "lucide-react";
import { useLocalBridge } from "@/hooks/use-local-bridge";

import { LiveListColumn } from "./live-list-column";
import { LiveCommentColumn } from "./live-comment-column";
import { LiveOrderColumn } from "./live-order-column";

export function LivestreamsScreen() {
  const activeLiveId = useSettingsStore(state => state.activeLiveId);
  const setActiveLiveId = useSettingsStore(state => state.setActiveLiveId);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const searchParams = useSearchParams();
  const queryLiveId = searchParams.get("liveId");

  React.useEffect(() => {
    if (queryLiveId) {
      setActiveLiveId(queryLiveId);
      setMobileView("detail");
    }
  }, [queryLiveId, setActiveLiveId]);
  const [liveStats, setLiveStats] = useState<LiveStats>({ totalOrder: 0, totalComment: 0, totalItems: 0 });
  const [filterQuery, setFilterQuery] = useState("");
  const { session } = useSession();
  const [quickChatUsername, setQuickChatUsername] = useState<string | null>(null);
  const [quickConversation, setQuickConversation] = useState<any | null>(null);
  const [isFetchingQuickConv, setIsFetchingQuickConv] = useState(false);

  const setHeader = useHeaderStore(state => state.setHeader);
  const resetHeader = useHeaderStore(state => state.resetHeader);

  // Local Bridge connection status and triggers
  const { isConnected: isBridgeConnected, isChecking: isBridgeChecking, checkStatus } = useLocalBridge();
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  // Sync connection status to dynamic Header as customContent (Connected badge)
  React.useEffect(() => {
    setHeader({
      title: "Phiên Live",
      subtitle: "Theo dõi và chốt đơn thời gian thực",
      showDateRange: false,
      customContent: isBridgeConnected ? (
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-[0_2px_8px_rgba(16,185,129,0.08)] select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Local Bridge: Connected
        </div>
      ) : null,
    });
    return () => resetHeader();
  }, [setHeader, resetHeader, isBridgeConnected]);

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
      {/* ─── LOCAL BRIDGE OFFLINE ALERT BANNER ─── */}
      {!isBridgeConnected && !isBridgeChecking && (
        <div className="mb-3 mx-2 sm:mx-3 bg-gradient-to-r from-amber-500/5 to-amber-600/[0.08] dark:from-amber-500/10 dark:to-amber-500/5 border border-amber-500/20 dark:border-amber-500/20 rounded-xl p-4 shadow-[var(--shadow-soft)] animate-[slideDown_0.3s_ease-out] select-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 leading-tight">
                  Chưa kết nối với LiveTracker Local Bridge
                </h4>
                <p className="text-xs text-amber-750/80 dark:text-amber-400/70 mt-1 leading-normal">
                  Để hệ thống có thể tự động in hóa đơn trực tiếp khi có bình luận chốt đơn, vui lòng cài đặt và chạy ứng dụng **LiveTrackerLocalBridge** trên máy tính kết nối trực tiếp với máy in.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center">
              <button
                type="button"
                onClick={() => void checkStatus()}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-amber-500/20 bg-white/80 dark:bg-[var(--surface)] hover:bg-[var(--hover)] px-3 text-xs font-semibold text-[var(--foreground)] hover:-translate-y-0.5 active:translate-y-0 transition shadow-sm cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Quét lại kết nối
              </button>

              <a
                href="https://github.com/duyzxje/LiveTrackerLocalBridge/releases"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 text-xs font-semibold text-white hover:-translate-y-0.5 active:translate-y-0 transition shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" />
                Tải Local Bridge
              </a>

              <button
                type="button"
                onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-transparent bg-transparent hover:bg-amber-500/5 px-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 transition cursor-pointer"
              >
                <span>Cấu hình bảo mật</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showTroubleshoot ? "rotate-180" : ""}`} />
              </button>
            </div>
          </div>

          {/* Browser Mixed Content Security Troubleshoot section */}
          {showTroubleshoot && (
            <div className="mt-3.5 pt-3.5 border-t border-amber-500/10 text-xs text-amber-800/90 dark:text-amber-400/90 leading-relaxed space-y-2 animate-[fadeIn_0.2s_ease-out]">
              <p className="font-bold flex items-center gap-1 text-amber-800 dark:text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                Lưu ý quan trọng nếu bạn đã mở ứng dụng nhưng vẫn báo Chưa kết nối:
              </p>
              <p>
                Trang web của chúng ta đang chạy dưới giao thức bảo mật **HTTPS**, còn ứng dụng Local Bridge chạy trên máy tính của bạn ở địa chỉ cục bộ **HTTP** (<span className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">http://127.0.0.1:13579</span>). Trình duyệt có thể âm thầm chặn kết nối này.
              </p>
              <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3 space-y-1.5">
                <p className="font-bold">Cách cho phép kết nối chỉ với 3 bước đơn giản:</p>
                <ol className="list-decimal pl-4.5 space-y-1">
                  <li>Click vào **biểu tượng ổ khóa** (hoặc nút cài đặt kết nối) nằm ở bên trái thanh địa chỉ trình duyệt.</li>
                  <li>Chọn **Cài đặt trang web (Site settings)**.</li>
                  <li>Tìm tùy chọn **Nội dung không an toàn (Insecure content)** và chuyển sang **Cho phép (Allow)**.</li>
                  <li>Tải lại trang web này (<kbd className="bg-[var(--surface)] border border-[var(--border)] px-1 rounded font-mono font-semibold">F5</kbd>) để kích hoạt kết nối tự động.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

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
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
}
