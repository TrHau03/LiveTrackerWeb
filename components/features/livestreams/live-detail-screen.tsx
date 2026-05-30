"use client";

import React, { useState, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import { useSession } from "@/components/session-provider";
import { useQuery } from "@tanstack/react-query";
import { useHeaderStore } from "@/lib/store/header-store";
import { streamProxyRequest, proxyRequest, asRecord, extractApiData, extractCollection, pickString, pickNumber, pickBoolean } from "@/lib/proxy-client";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { ChatPanel } from "../messenger/chat-panel";

import {
  Hero,
  Panel,
  Tag,
  LoadingState,
  ErrorState,
  EmptyState,
  CompanionMetric,
  MiniMetric,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  compactDate,
  formatDateTime,
  formatNumber,
  formatCurrency,
  formatStreamState,
  resolveInstagramHandle,
  buildInstagramUrl,
  safelyParseEvent,
  dedupeComments,
} from "@/components/ui/workspace-shared";

export function LiveDetailScreen({ liveId }: { liveId: string }) {
  const { logout, patchSession, session } = useSession();

  const handleFetchLiveDetailAndComments = async () => {
    const [liveResponse, commentsResponse] = await Promise.all([
      proxyRequest(session, { path: `/lives/${liveId}` }),
      proxyRequest(session, {
        path: `/comments/live/${liveId}/cursor`,
        query: { limit: 20, direction: "next" },
      }),
    ]);

    applyAuthResponses([liveResponse.response, commentsResponse.response], patchSession, logout);

    return {
      live: liveResponse.data,
      comments: extractCollection(commentsResponse.data)
    };
  };

  const { data, status, error: queryError } = useQuery({
    queryKey: ['live_detail', session.user?.id, liveId],
    queryFn: handleFetchLiveDetailAndComments,
    enabled: !!session.accessToken && !!liveId,
  });

  const liveState = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data?.live || null,
    error: queryError ? queryError.message : "",
  };

  const [realtimeComments, setRealtimeComments] = useState<Record<string, unknown>[]>([]);
  const [streamState, setStreamState] = useState<"connecting" | "live" | "stopped" | "error">("connecting");
  const abortRef = useRef<AbortController | null>(null);

  const setHeader = useHeaderStore(state => state.setHeader);
  const resetHeader = useHeaderStore(state => state.resetHeader);

  // States for Quick Chat panel
  const [quickChatUsername, setQuickChatUsername] = useState<string | null>(null);
  const [quickConversation, setQuickConversation] = useState<any | null>(null);
  const [isFetchingQuickConv, setIsFetchingQuickConv] = useState(false);

  const handleStartQuickChat = async (comment: Record<string, unknown>) => {
    const username = pickString(comment, ["igUsername", "username"]);
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

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    startTransition(() => {
      setStreamState("connecting");
    });

    streamProxyRequest(
      session,
      { path: `/comments/live/${liveId}/stream`, method: "GET" },
      (event) => {
        startTransition(() => {
          setStreamState("live");
        });

        const payload = safelyParseEvent(event.data);
        const nextComment = asRecord(payload.comment || payload);
        if (Object.keys(nextComment).length === 0) {
          return;
        }

        setRealtimeComments((current) => [nextComment, ...current].slice(0, 40));
      },
      controller.signal,
    )
      .then((response) => {
        if (!response) {
          return;
        }

        applyAuthResponses([response], patchSession, logout);
        if (!response.ok) {
          startTransition(() => {
            setStreamState("error");
          });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          startTransition(() => {
            setStreamState("error");
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [liveId, logout, patchSession, session]);

  const live = asRecord(extractApiData(liveState.data));
  const shop = asRecord(live.shop);
  const user = asRecord(live.user);
  const instagramHandle = resolveInstagramHandle(live, shop, user);
  const instagramUrl = buildInstagramUrl(instagramHandle);
  const liveTitle =
    pickString(shop, ["name"]) || pickString(live, ["igLiveId"]) || "Livestream";

  useEffect(() => {
    setHeader({
      title: liveTitle,
      subtitle: `Phiên live từ ${pickString(shop, ["name"]) || "Instagram"}`,
      showDateRange: false,
    });
    return () => resetHeader();
  }, [liveTitle, shop.name]);

  return (
    <div className="space-y-4 pb-28 lg:pb-6 pt-0">

      <div className="grid gap-3.5 xl:grid-cols-[1.12fr_0.88fr]">
        <Panel
          title="Comment stream"
          action={
            <div className="flex items-center gap-2">
              <Tag tone={streamState === "live" ? "blue" : streamState === "error" ? "danger" : "muted"}>
                {formatStreamState(streamState)}
              </Tag>
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                  setStreamState("stopped");
                }}
                className={SECONDARY_BUTTON_CLASS}
              >
                Stop
              </button>
            </div>
          }
        >
          {liveState.status === "loading" ? <LoadingState /> : null}
          {liveState.status === "error" ? <ErrorState message={liveState.error} /> : null}
          {(data?.comments?.length ?? 0) + realtimeComments.length === 0 ? <EmptyState message="Chưa có comment realtime." /> : null}

          <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
            {dedupeComments([...realtimeComments, ...(data?.comments || [])]).slice(0, 40).map((comment, index) => (
              <article
                key={`${pickString(comment, ["id", "_id"]) || index}`}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {pickString(comment, ["igUsername", "username"]) || "Instagram user"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatDateTime(pickString(comment, ["createdAt", "updatedAt"]))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleStartQuickChat(comment)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(59, 130, 246, 0.12)",
                        color: "#3b82f6",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 150ms",
                      }}
                      className="quick-chat-btn"
                      title="Trò chuyện nhanh"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                      </svg>
                    </button>

                    <Tag tone="muted">
                      Qty {formatNumber(pickNumber(comment, ["quantity"]) ?? 1)}
                    </Tag>
                    <Tag tone="blue">
                      {formatCurrency(pickNumber(comment, ["price"]) ?? 0)}
                    </Tag>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[var(--foreground-soft)]">
                  {pickString(comment, ["text", "content", "message"]) || "No message"}
                </p>
              </article>
            ))}
          </div>
        </Panel>

        <div className="space-y-4 relative overflow-hidden min-h-[600px] flex flex-col">
          {/* Main panels with slide transition */}
          <div
            className={`space-y-4 flex-1 flex flex-col transition-all duration-300 ease-out ${
              quickChatUsername
                ? "opacity-0 pointer-events-none translate-x-[-50px]"
                : "opacity-100 translate-x-0"
            }`}
          >
            <Panel title="Instagram companion">
              <div className="overflow-hidden rounded-[30px] border border-[var(--border)] bg-[linear-gradient(180deg,_rgba(9,13,22,0.98)_0%,_rgba(17,24,39,1)_100%)] shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 text-white/70">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="min-w-0 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium text-white/72">
                    <span className="block truncate">
                      {instagramHandle
                        ? `instagram.com/${instagramHandle}`
                        : "instagram.com"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div className="rounded-[26px] border border-white/10 bg-white/6 p-5 text-white">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,_rgba(255,255,255,0.2)_0%,_rgba(255,255,255,0.06)_100%)] text-sm font-semibold text-white">
                          {liveTitle.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {liveTitle}
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            {instagramHandle ? `@${instagramHandle}` : "Instagram live"}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-400/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        {pickBoolean(live, ["isLive"]) ? "Live signal" : "Preview"}
                      </span>
                    </div>

                    <p className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">
                      Open the real Instagram view without broken embeds.
                    </p>
                    <p className="mt-3 text-sm leading-7 text-white/68">
                      Instagram chặn việc nhúng trực tiếp trong iframe. Panel này
                      giữ đúng context phiên live để đội vận hành mở nhanh ở tab mới
                      mà không gặp lỗi `refused to connect`.
                    </p>

                    <div className="mt-3.5 grid grid-cols-3 gap-3">
                      <CompanionMetric
                        label="Comments"
                        value={formatNumber(
                          pickNumber(live, ["totalComment", "totalComments"]) ??
                          (data?.comments?.length ?? 0) + realtimeComments.length,
                        )}
                      />
                      <CompanionMetric
                        label="Orders"
                        value={formatNumber(
                          pickNumber(live, ["totalOrder", "totalOrders"]) ?? 0,
                        )}
                      />
                      <CompanionMetric
                        label="Updated"
                        value={compactDate(
                          pickString(live, ["lastWebhookAt", "updatedAt"]) || "",
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <MiniMetric
                      label="IG handle"
                      value={instagramHandle ? `@${instagramHandle}` : "Open homepage"}
                    />
                    <MiniMetric
                      label="Owner"
                      value={
                        pickString(user, ["fullName", "name", "username"]) ||
                        session.user?.fullName ||
                        "Owner"
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${PRIMARY_BUTTON_CLASS} flex-1`}
                    >
                      Open Instagram
                    </a>
                    <Link href="/livestreams" className={`${SECONDARY_BUTTON_CLASS} flex-1`}>
                      Back to livestreams
                    </Link>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Overview">
              <div className="grid gap-3">
                <MiniMetric label="IG Live ID" value={pickString(live, ["igLiveId"]) || liveId} />
                <MiniMetric label="Shop" value={pickString(shop, ["name"]) || "Unknown"} />
                <MiniMetric label="Owner" value={pickString(user, ["fullName", "name"]) || session.user?.fullName || "Owner"} />
                <MiniMetric label="Comments" value={formatNumber(pickNumber(live, ["totalComment", "totalComments"]) ?? (data?.comments?.length ?? 0) + realtimeComments.length)} />
                <MiniMetric label="Orders" value={formatNumber(pickNumber(live, ["totalOrder", "totalOrders"]) ?? 0)} />
                <MiniMetric label="Last activity" value={formatDateTime(pickString(live, ["lastWebhookAt", "updatedAt"]))} />
              </div>
            </Panel>
          </div>

          {/* Quick Chat Overlay Panel with slide animation */}
          <div
            className={`absolute inset-0 bg-[var(--surface)] border border-[var(--border)] rounded-[24px] overflow-hidden flex flex-col transition-all duration-300 ease-out z-10 shadow-[var(--shadow-medium)] ${
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
                <div className="flex-1 min-h-0 flex flex-col">
                  <ChatPanel conversation={quickConversation} />
                </div>
              )}
            </div>
          </div>

          <style jsx>{`
            .quick-chat-btn:hover {
              background-color: rgba(59, 130, 246, 0.22) !important;
              transform: scale(1.05);
            }
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
  );
}
