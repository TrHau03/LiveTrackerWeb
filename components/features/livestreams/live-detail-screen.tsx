"use client";

import React, { useState, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import { useSession } from "@/components/session-provider";
import { useQuery } from "@tanstack/react-query";
import { streamProxyRequest, proxyRequest } from "@/lib/proxy-client";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { asRecord, extractApiData, extractCollection, pickString, pickNumber, pickBoolean } from "@/lib/proxy-client";

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

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <Hero title={liveTitle} />

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
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

        <div className="space-y-6">
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

              <div className="space-y-5 p-5">
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

                  <div className="mt-5 grid grid-cols-3 gap-3">
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
      </div>
    </div>
  );
}
