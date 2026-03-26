"use client";

import Link from "next/link";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

import { useSession } from "@/components/session-provider";
import {
  asRecord,
  extractApiData,
  extractCollection,
  findFirstNumber,
  formatCurrency,
  formatDateTime,
  formatNumber,
  pickBoolean,
  pickNumber,
  pickString,
  proxyDownload,
  proxyRequest,
  streamProxyRequest,
} from "@/lib/proxy-client";

type LoadState = "idle" | "loading" | "ready" | "error";

type RequestState<T> = {
  status: LoadState;
  data: T | null;
  error: string;
};

type LiveStreamStatus = "idle" | "connecting" | "live" | "stopped" | "error";

type Primitive = string | number | boolean | null | undefined;

export function DashboardScreen() {
  const { isReady, patchSession, session } = useSession();
  const [state, setState] = useState<
    RequestState<{
      profile: unknown;
      dashboard: unknown;
      subscription: unknown;
      notifications: unknown;
    }>
  >({
    status: "idle",
    data: null,
    error: "",
  });

  useEffect(() => {
    if (!isReady || !session.baseUrl || !session.accessToken) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setState((current) => ({
        ...current,
        status: "loading",
        error: "",
      }));

      const requests = await Promise.allSettled([
        proxyRequest(session, { path: "/users/me" }),
        proxyRequest(session, { path: "/users/me/metrics/dashboard" }),
        proxyRequest(session, { path: "/subscriptions/user/my-subscription" }),
        proxyRequest(session, {
          path: "/notifications",
          query: { page: 1, limit: 5 },
        }),
      ]);

      if (cancelled) {
        return;
      }

      requests.forEach((result) => {
        if (result.status === "fulfilled") {
          syncSessionFromResponse(result.value.response, patchSession);
        }
      });

      const firstFailure = requests.find(
        (result) => result.status === "rejected",
      );

      if (firstFailure?.status === "rejected") {
        setState({
          status: "error",
          data: null,
          error: firstFailure.reason instanceof Error ? firstFailure.reason.message : "Không thể tải dashboard.",
        });
        return;
      }

      setState({
        status: "ready",
        data: {
          profile: (requests[0] as PromiseFulfilledResult<Awaited<ReturnType<typeof proxyRequest>>>).value.data,
          dashboard: (requests[1] as PromiseFulfilledResult<Awaited<ReturnType<typeof proxyRequest>>>).value.data,
          subscription: (requests[2] as PromiseFulfilledResult<Awaited<ReturnType<typeof proxyRequest>>>).value.data,
          notifications: (requests[3] as PromiseFulfilledResult<Awaited<ReturnType<typeof proxyRequest>>>).value.data,
        },
        error: "",
      });
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [isReady, patchSession, session]);

  const profile = asRecord(extractApiData(state.data?.profile));
  const dashboardMetrics = asRecord(extractApiData(state.data?.dashboard));
  const subscription = asRecord(extractApiData(state.data?.subscription));
  const notifications = extractCollection(state.data?.notifications).slice(0, 5);

  const metricCards = [
    {
      label: "Orders",
      value: summarizeMetric(dashboardMetrics.orders),
      tone: "sunset" as const,
    },
    {
      label: "Comments",
      value: summarizeMetric(dashboardMetrics.comments),
      tone: "ocean" as const,
    },
    {
      label: "Lives",
      value: summarizeMetric(dashboardMetrics.lives),
      tone: "forest" as const,
    },
    {
      label: "Customers",
      value: summarizeMetric(dashboardMetrics.customers),
      tone: "sand" as const,
    },
  ];

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <ScreenHero
        eyebrow="Dashboard"
        title="Tổng quan vận hành LiveTracker"
        description="Theo dõi profile hiện tại, metrics dashboard, subscription và thông báo mới nhất trên cùng một màn hình."
        actions={
          <div className="flex flex-wrap gap-3">
            <QuickLink href="/livestreams" label="Mở Livestreams" />
            <QuickLink href="/orders" label="Mở Orders" />
            <QuickLink href="/customers" label="Mở Customers" />
          </div>
        }
      />

      {!session.accessToken ? (
        <ConnectionEmptyState />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            tone={metric.tone}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Workspace profile"
          eyebrow="Identity"
          description="Thông tin người dùng hiện tại và subscription đang hoạt động."
        >
          {state.status === "loading" ? (
            <LoadingBlock />
          ) : state.status === "error" ? (
            <ErrorBlock message={state.error} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <DetailTile
                label="Full name"
                value={
                  pickString(profile, ["fullName", "username", "email"]) ||
                  "Chưa có"
                }
              />
              <DetailTile
                label="Email"
                value={pickString(profile, ["email"]) || "Chưa có"}
              />
              <DetailTile
                label="Role"
                value={pickString(profile, ["role"]) || "Authenticated"}
              />
              <DetailTile
                label="Subscription"
                value={
                  pickString(subscription, ["type", "name"]) || "Chưa xác định"
                }
              />
              <DetailTile
                label="Phone"
                value={pickString(profile, ["phone"]) || "Chưa có"}
              />
              <DetailTile
                label="Updated"
                value={formatDateTime(profile.updatedAt)}
              />
            </div>
          )}
        </Panel>

        <Panel
          title="Notifications"
          eyebrow="Realtime"
          description="5 notification gần nhất từ backend."
        >
          {state.status === "loading" ? (
            <LoadingBlock />
          ) : notifications.length === 0 ? (
            <EmptyBlock message="Chưa có notification nào để hiển thị." />
          ) : (
            <div className="space-y-3">
              {notifications.map((item, index) => {
                const title =
                  pickString(item, ["title", "message", "type"]) ||
                  `Notification ${index + 1}`;

                return (
                  <article
                    key={`${title}-${index}`}
                    className="rounded-[24px] border border-slate-900/10 bg-[#fffaf4] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <MiniBadge
                        tone={pickBoolean(item, ["isRead"]) ? "neutral" : "sunset"}
                      >
                        {pickBoolean(item, ["isRead"]) ? "Read" : "Unread"}
                      </MiniBadge>
                      <MiniBadge tone="ocean">
                        {pickString(item, ["type"]) || "general"}
                      </MiniBadge>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-slate-950">
                      {title}
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-slate-600">
                      {pickString(item, ["body", "content", "message"]) ||
                        "Không có nội dung chi tiết."}
                    </p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {formatDateTime(
                        pickString(item, ["createdAt", "updatedAt"]),
                      )}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        title="Metrics breakdown"
        eyebrow="Business"
        description="Hiển thị các block object chính từ endpoint `/users/me/metrics/dashboard` để kiểm tra vận hành nhanh."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(dashboardMetrics)
            .filter(([key]) => key !== "period")
            .slice(0, 8)
            .map(([key, value]) => (
              <article
                key={key}
                className="rounded-[24px] border border-slate-900/10 bg-[#f9f4ec] p-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {key}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {formatNumber(summarizeMetric(value))}
                </p>
                <pre className="mt-4 overflow-auto text-xs leading-6 text-slate-600">
                  {JSON.stringify(value, null, 2)}
                </pre>
              </article>
            ))}
        </div>
      </Panel>
    </div>
  );
}

export function LivestreamsScreen() {
  const { isReady, patchSession, session } = useSession();
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const deferredSearch = useDeferredValue(search);
  const [state, setState] = useState<RequestState<unknown>>({
    status: "idle",
    data: null,
    error: "",
  });

  useEffect(() => {
    if (!isReady || !session.baseUrl || !session.accessToken) {
      return;
    }

    let cancelled = false;

    async function loadLives() {
      setState((current) => ({
        ...current,
        status: "loading",
        error: "",
      }));

      try {
        const result = await proxyRequest(session, {
          path: "/lives/my-lives",
          query: {
            page: 1,
            limit: 12,
            search: deferredSearch || undefined,
          },
        });

        if (cancelled) {
          return;
        }

        syncSessionFromResponse(result.response, patchSession);
        setState({
          status: "ready",
          data: result.data,
          error: "",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Không thể tải livestreams.",
        });
      }
    }

    loadLives();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, isReady, patchSession, refreshKey, session]);

  const livestreams = extractCollection(state.data).map((item) => {
    const shop = asRecord(item.shop);
    const user = asRecord(item.user);
    const routeId =
      pickString(item, ["id", "_id"]) || pickString(item, ["igLiveId"]);

    return {
      id: routeId,
      igLiveId: pickString(item, ["igLiveId"]) || routeId,
      title:
        pickString(shop, ["name"]) || `Livestream ${pickString(item, ["igLiveId"]) || routeId}`,
      isLive: pickBoolean(item, ["isLive"]) ?? false,
      totalComment:
        pickNumber(item, ["totalComment", "totalComments"]) ?? 0,
      totalOrder: pickNumber(item, ["totalOrder", "totalOrders"]) ?? 0,
      lastWebhookAt: pickString(item, ["lastWebhookAt", "updatedAt", "createdAt"]),
      owner:
        pickString(user, ["fullName", "name"]) ||
        pickString(item, ["userId"]) ||
        "Current user",
      shopName: pickString(shop, ["name"]) || "Chưa có shop",
    };
  });

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <ScreenHero
        eyebrow="Livestreams"
        title="Danh sách live đang nghe webhook"
        description="Lấy từ endpoint `/lives/my-lives`. Mỗi live mở ra màn chi tiết comment listener dùng SSE và iframe Instagram."
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRefreshKey((current) => current + 1)}
              className="inline-flex rounded-full bg-[#102b3b] px-4 py-2 text-sm font-semibold text-white"
            >
              Refresh list
            </button>
          </div>
        }
      />

      {!session.accessToken ? <ConnectionEmptyState /> : null}

      <Panel
        title="Live registry"
        eyebrow="Webhook"
        description="Tìm kiếm theo từ khóa và mở thẳng vào feed comment realtime."
      >
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo igLiveId hoặc shop"
            className="h-12 flex-1 rounded-2xl border border-slate-900/10 bg-white px-4 text-sm outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
          />
          <div className="rounded-full bg-[#f1ece4] px-4 py-2 text-sm text-slate-600">
            {livestreams.length} live trên trang hiện tại
          </div>
        </div>

        {state.status === "loading" ? <LoadingBlock /> : null}
        {state.status === "error" ? <ErrorBlock message={state.error} /> : null}
        {state.status === "ready" && livestreams.length === 0 ? (
          <EmptyBlock message="Không có livestream nào khớp với bộ lọc hiện tại." />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {livestreams.map((live) => (
            <Link
              key={live.id}
              href={`/livestreams/${encodeURIComponent(live.id)}`}
              className="rounded-[28px] border border-slate-900/10 bg-[#fffaf4] p-5 transition hover:-translate-y-0.5 hover:border-[#ed6f57]/35 hover:bg-white"
            >
              <div className="flex flex-wrap items-center gap-2">
                <MiniBadge tone={live.isLive ? "forest" : "neutral"}>
                  {live.isLive ? "Live" : "Offline"}
                </MiniBadge>
                <MiniBadge tone="sunset">Webhook</MiniBadge>
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                {live.title}
              </h3>
              <p className="mt-2 break-all text-sm text-slate-600">
                {live.igLiveId}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <InlineMetric label="Comments" value={formatNumber(live.totalComment)} />
                <InlineMetric label="Orders" value={formatNumber(live.totalOrder)} />
                <InlineMetric label="Owner" value={live.owner} />
                <InlineMetric label="Webhook" value={formatDateTime(live.lastWebhookAt)} />
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function LiveDetailScreen({ liveId }: { liveId: string }) {
  const { isReady, patchSession, session } = useSession();
  const [liveState, setLiveState] = useState<RequestState<unknown>>({
    status: "idle",
    data: null,
    error: "",
  });
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [streamStatus, setStreamStatus] = useState<LiveStreamStatus>("idle");
  const [connectionId, setConnectionId] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isReady || !session.baseUrl || !session.accessToken) {
      return;
    }

    let cancelled = false;

    async function loadLive() {
      setLiveState((current) => ({
        ...current,
        status: "loading",
        error: "",
      }));

      try {
        const [liveResult, commentsResult] = await Promise.all([
          proxyRequest(session, { path: `/lives/${liveId}` }),
          proxyRequest(session, {
            path: `/comments/live/${liveId}/cursor`,
            query: { limit: 20, direction: "next" },
          }),
        ]);

        if (cancelled) {
          return;
        }

        syncSessionFromResponse(liveResult.response, patchSession);
        syncSessionFromResponse(commentsResult.response, patchSession);

        setLiveState({
          status: "ready",
          data: liveResult.data,
          error: "",
        });
        setComments(extractCollection(commentsResult.data));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLiveState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Không thể tải dữ liệu live.",
        });
      }
    }

    loadLive();

    return () => {
      cancelled = true;
    };
  }, [isReady, liveId, patchSession, session]);

  useEffect(() => {
    if (!isReady || !session.baseUrl || !session.accessToken) {
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    startTransition(() => {
      setStreamStatus("connecting");
    });

    streamProxyRequest(
      session,
      {
        path: `/comments/live/${liveId}/stream`,
      },
      (event) => {
        setStreamStatus("live");
        setEvents((current) => {
          const next = [event.data, ...current];
          return next.slice(0, 12);
        });

        const parsed = safelyParseJson(event.data);
        const payload = asRecord(parsed);

        if (pickString(payload, ["connectionId"])) {
          setConnectionId(pickString(payload, ["connectionId"]));
        }

        const nextComment = asRecord(payload.comment);
        if (Object.keys(nextComment).length > 0) {
          setComments((current) => dedupeComments([nextComment, ...current]));
        }
      },
      controller.signal,
    )
      .then((response) => {
        if (response) {
          syncSessionFromResponse(response.headers, patchSession);
          if (!response.ok) {
            setStreamStatus("error");
          }
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStreamStatus("error");
        }
      });

    return () => {
      controller.abort();
    };
  }, [isReady, liveId, patchSession, session]);

  const live = asRecord(extractApiData(liveState.data));
  const shop = asRecord(live.shop);
  const user = asRecord(live.user);
  const liveMetrics = [
    {
      label: "IG live ID",
      value: pickString(live, ["igLiveId", "id", "_id"]) || liveId,
    },
    {
      label: "Shop",
      value: pickString(shop, ["name"]) || "Chưa có",
    },
    {
      label: "Owner",
      value: pickString(user, ["fullName", "name"]) || "Current user",
    },
    {
      label: "Webhook",
      value: formatDateTime(pickString(live, ["lastWebhookAt", "updatedAt"])),
    },
  ];

  async function handleReloadComments() {
    if (!session.accessToken) {
      return;
    }

    await proxyRequest(session, {
      path: `/lives/${liveId}/comments/reload`,
    });
  }

  async function handleStopStream() {
    abortRef.current?.abort();
    setStreamStatus("stopped");

    if (!connectionId) {
      return;
    }

    try {
      await proxyRequest(session, {
        path: `/comments/live/${liveId}/stream/disconnect/${connectionId}`,
        method: "POST",
      });
    } catch {
      // Ignore disconnect cleanup failure.
    }
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <ScreenHero
        eyebrow="Livestream detail"
        title={`Comment listener cho live ${liveId}`}
        description="Màn hình này lấy chi tiết live, tải danh sách comment gần nhất và nối SSE stream để nghe webhook realtime."
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleReloadComments}
              className="inline-flex rounded-full bg-[#102b3b] px-4 py-2 text-sm font-semibold text-white"
            >
              Reload comments
            </button>
            <button
              type="button"
              onClick={handleStopStream}
              className="inline-flex rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Stop stream
            </button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Realtime comment feed"
          eyebrow="SSE"
          description="Nguồn dữ liệu từ `/comments/live/:liveId/stream` và `/comments/live/:liveId/cursor`."
        >
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <MiniBadge
              tone={
                streamStatus === "live"
                  ? "forest"
                  : streamStatus === "error"
                    ? "danger"
                    : "neutral"
              }
            >
              {streamStatus}
            </MiniBadge>
            <MiniBadge tone="ocean">
              {comments.length} comments loaded
            </MiniBadge>
            {connectionId ? <MiniBadge tone="sand">{connectionId}</MiniBadge> : null}
          </div>

          {liveState.status === "loading" ? <LoadingBlock /> : null}
          {liveState.status === "error" ? (
            <ErrorBlock message={liveState.error} />
          ) : null}

          <div className="space-y-3">
            {comments.length === 0 ? (
              <EmptyBlock message="Chưa nhận được comment nào cho live này." />
            ) : (
              comments.map((comment, index) => {
                const customer = asRecord(comment.customer);
                return (
                  <article
                    key={`${pickString(comment, ["id", "_id"]) || index}`}
                    className="rounded-[24px] border border-slate-900/10 bg-[#fffaf4] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {pickString(comment, ["igUsername", "username"]) ||
                            pickString(customer, ["igName", "name"]) ||
                            "Instagram user"}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                          {formatDateTime(
                            pickString(comment, ["createdAt", "updatedAt"]),
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <MiniBadge tone="ocean">
                          Qty {formatNumber(pickNumber(comment, ["quantity"]) ?? 1)}
                        </MiniBadge>
                        <MiniBadge tone="sunset">
                          {formatCurrency(pickNumber(comment, ["price"]) ?? 0)}
                        </MiniBadge>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-700">
                      {pickString(comment, ["text", "message", "content"]) ||
                        "Không có nội dung comment."}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Instagram iframe"
            eyebrow="Preview"
            description="Nhúng trực tiếp `instagram.com`. Trên thực tế Instagram thường chặn iframe bằng header bảo mật, nên có sẵn link mở tab mới."
          >
            <div className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-slate-950">
              <iframe
                src="https://www.instagram.com/"
                title="Instagram preview"
                loading="lazy"
                className="h-[420px] w-full bg-white"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Nếu iframe bị chặn, đó là giới hạn từ phía Instagram chứ không phải
              lỗi giao diện.
            </p>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex rounded-full bg-[#ed6f57] px-4 py-2 text-sm font-semibold text-white"
            >
              Open Instagram in new tab
            </a>
          </Panel>

          <Panel
            title="Live metadata"
            eyebrow="Context"
            description="Thông tin tóm tắt từ endpoint `/lives/:id`."
          >
            <div className="grid gap-3">
              {liveMetrics.map((item) => (
                <DetailTile key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </Panel>

          <Panel
            title="Recent stream events"
            eyebrow="Debug"
            description="12 event gần nhất từ SSE stream."
          >
            {events.length === 0 ? (
              <EmptyBlock message="Chưa có event nào từ stream." />
            ) : (
              <div className="space-y-3">
                {events.map((event, index) => (
                  <pre
                    key={`${index}-${event.slice(0, 24)}`}
                    className="overflow-auto rounded-[22px] border border-slate-900/10 bg-[#f9f4ec] p-4 text-xs leading-6 text-slate-700"
                  >
                    {event}
                  </pre>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function OrdersScreen() {
  const { isReady, patchSession, session } = useSession();
  const [search, setSearch] = useState("");
  const [exportStart, setExportStart] = useState("2026-03-01");
  const [exportEnd, setExportEnd] = useState("2026-03-31");
  const deferredSearch = useDeferredValue(search);
  const [state, setState] = useState<RequestState<unknown>>({
    status: "idle",
    data: null,
    error: "",
  });
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [exportMessage, setExportMessage] = useState("");

  useEffect(() => {
    if (!isReady || !session.baseUrl || !session.accessToken) {
      return;
    }

    let cancelled = false;

    async function loadOrders() {
      setState((current) => ({
        ...current,
        status: "loading",
        error: "",
      }));

      try {
        const result = await proxyRequest(session, {
          path: "/orders/user/my-orders",
          query: {
            page: 1,
            limit: 18,
            search: deferredSearch || undefined,
          },
        });

        if (cancelled) {
          return;
        }

        syncSessionFromResponse(result.response, patchSession);
        setState({
          status: "ready",
          data: result.data,
          error: "",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Không thể tải orders.",
        });
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, isReady, patchSession, session]);

  const orders = extractCollection(state.data);
  const effectiveSelectedOrderId =
    selectedOrderId || pickString(orders[0], ["id", "_id"]);
  const selectedOrder =
    orders.find((item) => pickString(item, ["id", "_id"]) === effectiveSelectedOrderId) ??
    orders[0] ??
    null;

  const revenue = orders.reduce((total, item) => {
    return total + (pickNumber(item, ["totalPrice", "amount"]) ?? 0);
  }, 0);
  const deposit = orders.reduce((total, item) => {
    return total + (pickNumber(item, ["deposit"]) ?? 0);
  }, 0);

  async function handleExportExcel() {
    if (!session.accessToken) {
      return;
    }

    const download = await proxyDownload(session, {
      path: "/orders/export/excel",
      query: {
        startDate: exportStart,
        endDate: exportEnd,
      },
    });

    syncSessionFromResponse(download.response, patchSession);

    if (!download.ok) {
      setExportMessage("Export thất bại. Kiểm tra lại khoảng ngày hoặc token.");
      URL.revokeObjectURL(download.url);
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = download.url;
    anchor.download = download.filename;
    anchor.click();

    setExportMessage(`Đã tạo file ${download.filename}`);
    window.setTimeout(() => URL.revokeObjectURL(download.url), 60_000);
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <ScreenHero
        eyebrow="Orders"
        title="Quản lý đơn hàng theo live"
        description="Lấy dữ liệu từ `/orders/user/my-orders` và hỗ trợ export Excel bằng `/orders/export/excel`."
        actions={
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              value={exportStart}
              onChange={(event) => setExportStart(event.target.value)}
              className="h-11 rounded-2xl border border-slate-900/10 bg-white px-4 text-sm outline-none"
            />
            <input
              type="date"
              value={exportEnd}
              onChange={(event) => setExportEnd(event.target.value)}
              className="h-11 rounded-2xl border border-slate-900/10 bg-white px-4 text-sm outline-none"
            />
            <button
              type="button"
              onClick={handleExportExcel}
              className="sm:col-span-2 inline-flex justify-center rounded-full bg-[#102b3b] px-4 py-2 text-sm font-semibold text-white"
            >
              Export Excel
            </button>
          </div>
        }
      />

      {!session.accessToken ? <ConnectionEmptyState /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Orders page" value={orders.length} tone="ocean" />
        <MetricCard label="Revenue page" value={formatCurrency(revenue)} tone="sunset" />
        <MetricCard label="Deposits page" value={formatCurrency(deposit)} tone="sand" />
      </div>

      {exportMessage ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {exportMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel
          title="Order list"
          eyebrow="Operations"
          description="Danh sách đơn hàng hiện tại. Chọn một đơn để xem chi tiết nhanh bên phải."
        >
          <div className="mb-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo order code, customer name hoặc phone"
              className="h-12 w-full rounded-2xl border border-slate-900/10 bg-white px-4 text-sm outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
            />
          </div>

          {state.status === "loading" ? <LoadingBlock /> : null}
          {state.status === "error" ? <ErrorBlock message={state.error} /> : null}
          {state.status === "ready" && orders.length === 0 ? (
            <EmptyBlock message="Không có order nào cho bộ lọc hiện tại." />
          ) : null}

          <div className="space-y-3">
            {orders.map((order, index) => {
              const orderId = pickString(order, ["id", "_id"]) || `${index}`;
              const active = selectedOrderId === orderId;
              return (
                <button
                  key={orderId}
                  type="button"
                  onClick={() => setSelectedOrderId(orderId)}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    active
                      ? "border-[#ed6f57]/35 bg-white shadow-[0_18px_40px_rgba(53,34,14,0.08)]"
                      : "border-slate-900/10 bg-[#fffaf4] hover:border-slate-900/20 hover:bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <MiniBadge tone="ocean">
                      {pickString(order, ["orderCode", "code"]) || "Order"}
                    </MiniBadge>
                    <MiniBadge
                      tone={
                        (pickNumber(order, ["deposit"]) ?? 0) > 0
                          ? "sunset"
                          : "neutral"
                      }
                    >
                      Deposit {formatCurrency(pickNumber(order, ["deposit"]) ?? 0)}
                    </MiniBadge>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-slate-950">
                    {pickString(order, ["igName", "customerName"]) || "Khách hàng"}
                  </h3>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <InlineMetric
                      label="Total"
                      value={formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}
                    />
                    <InlineMetric
                      label="Created"
                      value={formatDateTime(
                        pickString(order, ["createdAt", "updatedAt"]),
                      )}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Selected order"
          eyebrow="Detail"
          description="Tóm tắt chi tiết đơn hàng đang chọn. Thao tác chuyên sâu vẫn có thể dùng ở API Studio."
        >
          {!selectedOrder ? (
            <EmptyBlock message="Chọn một đơn hàng để xem chi tiết." />
          ) : (
            <div className="space-y-4">
              <DetailTile
                label="Order code"
                value={pickString(selectedOrder, ["orderCode", "code"]) || "Chưa có"}
              />
              <DetailTile
                label="Customer"
                value={pickString(selectedOrder, ["igName", "customerName"]) || "Chưa có"}
              />
              <DetailTile
                label="Phone"
                value={pickString(selectedOrder, ["phone"]) || "Chưa có"}
              />
              <DetailTile
                label="Deposit"
                value={formatCurrency(pickNumber(selectedOrder, ["deposit"]) ?? 0)}
              />
              <DetailTile
                label="Total price"
                value={formatCurrency(pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0)}
              />
              <DetailTile
                label="Created"
                value={formatDateTime(
                  pickString(selectedOrder, ["createdAt", "updatedAt"]),
                )}
              />
              <pre className="overflow-auto rounded-[22px] border border-slate-900/10 bg-[#f9f4ec] p-4 text-xs leading-6 text-slate-700">
                {JSON.stringify(selectedOrder, null, 2)}
              </pre>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function CustomersScreen() {
  const { isReady, patchSession, session } = useSession();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [state, setState] = useState<RequestState<unknown>>({
    status: "idle",
    data: null,
    error: "",
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [detailState, setDetailState] = useState<RequestState<unknown>>({
    status: "idle",
    data: null,
    error: "",
  });

  useEffect(() => {
    if (!isReady || !session.baseUrl || !session.accessToken) {
      return;
    }

    let cancelled = false;

    async function loadCustomers() {
      setState((current) => ({
        ...current,
        status: "loading",
        error: "",
      }));

      try {
        const result = await proxyRequest(session, {
          path: "/customers/user/my-customers",
          query: {
            page: 1,
            limit: 18,
            search: deferredSearch || undefined,
          },
        });

        if (cancelled) {
          return;
        }

        syncSessionFromResponse(result.response, patchSession);
        setState({
          status: "ready",
          data: result.data,
          error: "",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Không thể tải customers.",
        });
      }
    }

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [deferredSearch, isReady, patchSession, session]);

  const customers = extractCollection(state.data);
  const effectiveSelectedCustomerId =
    selectedCustomerId || pickString(customers[0], ["id", "_id"]);
  const selectedCustomer =
    customers.find(
      (item) => pickString(item, ["id", "_id"]) === effectiveSelectedCustomerId,
    ) ??
    customers[0] ??
    null;

  useEffect(() => {
    if (!effectiveSelectedCustomerId || !session.accessToken) {
      return;
    }

    let cancelled = false;

    async function loadCustomerDetail() {
      setDetailState((current) => ({
        ...current,
        status: "loading",
        error: "",
      }));

      try {
        const result = await proxyRequest(session, {
          path: `/customers/${effectiveSelectedCustomerId}`,
          query: { includeHistories: true },
        });

        if (cancelled) {
          return;
        }

        syncSessionFromResponse(result.response, patchSession);
        setDetailState({
          status: "ready",
          data: result.data,
          error: "",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setDetailState({
          status: "error",
          data: null,
          error:
            error instanceof Error ? error.message : "Không thể tải customer detail.",
        });
      }
    }

    loadCustomerDetail();

    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedCustomerId, patchSession, session]);

  const phoneCount = customers.filter(
    (item) => Boolean(pickString(item, ["phone"])),
  ).length;
  const selectedDetail = asRecord(extractApiData(detailState.data));
  const selectedTags = extractCollection(selectedDetail.tags);
  const histories = extractCollection(selectedDetail.histories);

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <ScreenHero
        eyebrow="Customers"
        title="Quản lý khách hàng và hồ sơ mua hàng"
        description="Lấy danh sách từ `/customers/user/my-customers` và detail từ `/customers/:customerId?includeHistories=true`."
      />

      {!session.accessToken ? <ConnectionEmptyState /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Customers page" value={customers.length} tone="forest" />
        <MetricCard label="Có số điện thoại" value={phoneCount} tone="sand" />
        <MetricCard
          label="Có lịch sử"
          value={formatNumber(histories.length)}
          tone="ocean"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel
          title="Customer list"
          eyebrow="Audience"
          description="Chọn một customer để xem profile chi tiết, tags và histories."
        >
          <div className="mb-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên Instagram hoặc số điện thoại"
              className="h-12 w-full rounded-2xl border border-slate-900/10 bg-white px-4 text-sm outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
            />
          </div>

          {state.status === "loading" ? <LoadingBlock /> : null}
          {state.status === "error" ? <ErrorBlock message={state.error} /> : null}
          {state.status === "ready" && customers.length === 0 ? (
            <EmptyBlock message="Không có khách hàng nào khớp điều kiện lọc." />
          ) : null}

          <div className="space-y-3">
            {customers.map((customer, index) => {
              const customerId = pickString(customer, ["id", "_id"]) || `${index}`;
              const active = selectedCustomerId === customerId;

              return (
                <button
                  key={customerId}
                  type="button"
                  onClick={() => setSelectedCustomerId(customerId)}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    active
                      ? "border-[#ed6f57]/35 bg-white shadow-[0_18px_40px_rgba(53,34,14,0.08)]"
                      : "border-slate-900/10 bg-[#fffaf4] hover:border-slate-900/20 hover:bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <MiniBadge tone="forest">
                      {pickString(customer, ["igName", "name"]) || "Customer"}
                    </MiniBadge>
                    {pickString(customer, ["phone"]) ? (
                      <MiniBadge tone="ocean">{pickString(customer, ["phone"])}</MiniBadge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-700">
                    {buildAddress(customer) || "Chưa có địa chỉ"}
                  </p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    {formatDateTime(
                      pickString(customer, ["updatedAt", "createdAt"]),
                    )}
                  </p>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Customer detail"
          eyebrow="Profile"
          description="Panel chi tiết dành cho customer đang chọn."
        >
          {!selectedCustomer ? (
            <EmptyBlock message="Chọn một customer để xem hồ sơ." />
          ) : detailState.status === "loading" ? (
            <LoadingBlock />
          ) : detailState.status === "error" ? (
            <ErrorBlock message={detailState.error} />
          ) : (
            <div className="space-y-4">
              <DetailTile
                label="Instagram name"
                value={
                  pickString(selectedDetail, ["igName", "name"]) ||
                  pickString(selectedCustomer, ["igName", "name"]) ||
                  "Chưa có"
                }
              />
              <DetailTile
                label="Phone"
                value={
                  pickString(selectedDetail, ["phone"]) ||
                  pickString(selectedCustomer, ["phone"]) ||
                  "Chưa có"
                }
              />
              <DetailTile
                label="Birthday"
                value={formatDateTime(pickString(selectedDetail, ["dayOfBirth"]))}
              />
              <DetailTile
                label="Address"
                value={buildAddress(selectedDetail) || buildAddress(selectedCustomer) || "Chưa có"}
              />
              <DetailTile
                label="Note"
                value={pickString(selectedDetail, ["note"]) || "Không có ghi chú"}
              />

              <div className="rounded-[22px] border border-slate-900/10 bg-[#f9f4ec] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Tags
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTags.length === 0 ? (
                    <MiniBadge tone="neutral">Chưa có tag</MiniBadge>
                  ) : (
                    selectedTags.map((tag, index) => (
                      <MiniBadge key={`${pickString(tag, ["id", "_id"]) || index}`} tone="sunset">
                        {pickString(tag, ["label", "name"]) || "Tag"}
                      </MiniBadge>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-900/10 bg-[#f9f4ec] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Histories
                </p>
                {histories.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Chưa có history nào trong payload hiện tại.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {histories.slice(0, 5).map((history, index) => (
                      <div
                        key={`${index}-${pickString(history, ["id", "_id"])}`}
                        className="rounded-2xl border border-slate-900/10 bg-white px-3 py-3 text-sm text-slate-700"
                      >
                        {pickString(history, ["title", "action", "type", "note"]) ||
                          JSON.stringify(history)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function ScreenHero({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[36px] border border-slate-900/10 bg-[linear-gradient(135deg,_rgba(16,43,59,0.98)_0%,_rgba(27,62,82,0.95)_48%,_rgba(237,111,87,0.96)_100%)] p-6 text-white shadow-[0_30px_100px_rgba(16,43,59,0.18)] md:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/65">
        {eyebrow}
      </p>
      <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/78 md:text-base">
            {description}
          </p>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </section>
  );
}

function Panel({
  title,
  eyebrow,
  description,
  children,
}: {
  title: string;
  eyebrow: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_20px_80px_rgba(110,81,41,0.08)] backdrop-blur-xl md:p-6">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: Primitive;
  tone: "sunset" | "ocean" | "forest" | "sand";
}) {
  const styles = {
    sunset: "from-[#ed6f57]/18 to-[#fffaf4]",
    ocean: "from-[#102b3b]/16 to-[#f6f0e8]",
    forest: "from-emerald-500/16 to-[#f6f0e8]",
    sand: "from-amber-400/18 to-[#fffaf4]",
  }[tone];

  return (
    <article
      className={`rounded-[28px] border border-slate-900/10 bg-gradient-to-br ${styles} p-5 shadow-[0_20px_80px_rgba(110,81,41,0.06)]`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-slate-950">
        {typeof value === "number" ? formatNumber(value) : String(value)}
      </p>
    </article>
  );
}

function DetailTile({ label, value }: { label: string; value: Primitive }) {
  return (
    <div className="rounded-[22px] border border-slate-900/10 bg-[#fffaf4] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm leading-7 text-slate-800">
        {String(value)}
      </p>
    </div>
  );
}

function InlineMetric({ label, value }: { label: string; value: Primitive }) {
  return (
    <div className="rounded-[20px] bg-slate-100 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-semibold text-slate-900">
        {String(value)}
      </p>
    </div>
  );
}

function MiniBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "sunset" | "ocean" | "forest" | "sand" | "neutral" | "danger";
}) {
  const styles = {
    sunset: "bg-[#ffe0d9] text-[#ac3f29]",
    ocean: "bg-[#dceaf2] text-[#1f4b66]",
    forest: "bg-emerald-100 text-emerald-800",
    sand: "bg-amber-100 text-amber-800",
    neutral: "bg-slate-100 text-slate-700",
    danger: "bg-rose-100 text-rose-800",
  }[tone];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles}`}
    >
      {children}
    </span>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/14"
    >
      {label}
    </Link>
  );
}

function ConnectionEmptyState() {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-900/15 bg-white/75 px-5 py-4 text-sm leading-7 text-slate-600">
      Màn hình này cần `accessToken`. Hãy mở `Backend settings` ở góc trên bên phải
      để nhập backend origin và JWT trước khi tải dữ liệu.
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="rounded-[24px] border border-slate-900/10 bg-[#f9f4ec] px-4 py-5 text-sm text-slate-600">
      Đang tải dữ liệu...
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-5 text-sm text-rose-800">
      {message}
    </div>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-900/10 bg-[#f9f4ec] px-4 py-5 text-sm text-slate-600">
      {message}
    </div>
  );
}

function summarizeMetric(value: unknown) {
  const record = asRecord(value);

  return (
    pickNumber(record, [
      "total",
      "count",
      "totalOrders",
      "totalComments",
      "totalLives",
      "totalCustomers",
      "value",
    ]) ?? findFirstNumber(record) ?? 0
  );
}

function syncSessionFromResponse(
  response: Response | Headers,
  patchSession: (patch: Record<string, string>) => void,
) {
  const headers = response instanceof Response ? response.headers : response;
  const refreshedAccessToken = headers.get("x-refreshed-access-token");

  if (refreshedAccessToken) {
    patchSession({
      accessToken: refreshedAccessToken,
    });
  }
}

function safelyParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}

function dedupeComments(comments: Record<string, unknown>[]) {
  const seen = new Set<string>();
  return comments.filter((comment, index) => {
    const key =
      pickString(comment, ["id", "_id"]) ||
      `${pickString(comment, ["createdAt"])}-${pickString(comment, ["text"])}-${index}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildAddress(value: unknown) {
  const record = asRecord(value);
  return [
    pickString(record, ["street"]),
    pickString(record, ["ward"]),
    pickString(record, ["province"]),
  ]
    .filter(Boolean)
    .join(", ");
}
