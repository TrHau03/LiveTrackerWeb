"use client";

import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";

import { InstagramLinkPanel } from "@/components/instagram-link-panel";
import { useSession } from "@/components/session-provider";
import {
  asRecord,
  extractApiData,
  extractCollection,
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
import type { SessionSettings } from "@/lib/workspace-session";

type AsyncState<T> = {
  status: "idle" | "loading" | "ready" | "error";
  data: T | null;
  error: string;
};

type Primitive = string | number | boolean | null | undefined;

const CONTROL_CLASS =
  "h-12 rounded-[18px] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary-soft)]";
const PRIMARY_BUTTON_CLASS =
  "inline-flex h-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,_var(--primary)_0%,_var(--primary-strong)_100%)] px-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(10,132,255,0.22)] transition hover:-translate-y-0.5";
const SECONDARY_BUTTON_CLASS =
  "inline-flex h-12 items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:-translate-y-0.5 hover:border-[color:var(--primary-soft)]";

export function DashboardScreen() {
  const { logout, patchSession, session } = useSession();
  const [state, setState] = useState<
    AsyncState<{
      dashboard: unknown;
      subscription: unknown;
      orders: unknown;
      notifications: unknown;
    }>
  >({
    status: "loading",
    data: null,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [dashboard, subscription, orders, notifications] =
          await Promise.all([
            proxyRequest(session, { path: "/users/me/metrics/dashboard" }),
            proxyRequest(session, { path: "/subscriptions/user/my-subscription" }),
            proxyRequest(session, {
              path: "/orders/user/my-orders",
              query: { page: 1, limit: 6 },
            }),
            proxyRequest(session, {
              path: "/notifications",
              query: { page: 1, limit: 4 },
            }),
          ]);

        if (cancelled) {
          return;
        }

        handleAuthSync([dashboard.response, subscription.response, orders.response, notifications.response], patchSession, logout);

        setState({
          status: "ready",
          data: {
            dashboard: dashboard.data,
            subscription: subscription.data,
            orders: orders.data,
            notifications: notifications.data,
          },
          error: "",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Unable to load dashboard.",
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [logout, patchSession, session]);

  const metrics = asRecord(extractApiData(state.data?.dashboard));
  const ordersMetric = compactMetric(metrics.orders);
  const commentsMetric = compactMetric(metrics.comments);
  const livesMetric = compactMetric(metrics.lives);
  const customersMetric = compactMetric(metrics.customers);
  const subscription = asRecord(extractApiData(state.data?.subscription));
  const recentOrders = extractCollection(state.data?.orders).slice(0, 4);
  const notifications = extractCollection(state.data?.notifications).slice(0, 4);

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <Hero
        label="Commerce Overview"
        title={`Welcome back, ${session.user?.fullName || "team"}.`}
        description="Một góc nhìn gọn, nhanh và rõ cho mọi thứ đang diễn ra quanh livestream commerce của bạn."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders" value={ordersMetric.primary} accent="blue" />
        <StatCard label="Comments" value={commentsMetric.primary} accent="cyan" />
        <StatCard label="Livestreams" value={livesMetric.primary} accent="indigo" />
        <StatCard label="Customers" value={customersMetric.primary} accent="slate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Recent orders" action={<LinkPill href="/orders" label="View all" />}>
          {state.status === "loading" ? <LoadingState /> : null}
          {state.status === "error" ? <ErrorState message={state.error} /> : null}
          {state.status === "ready" && recentOrders.length === 0 ? (
            <EmptyState message="Chưa có đơn hàng nào gần đây." />
          ) : null}

          <div className="space-y-3">
            {recentOrders.map((order, index) => (
              <article
                key={`${pickString(order, ["id", "_id", "orderCode"]) || index}`}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {pickString(order, ["orderCode", "code"]) || "Order"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {pickString(order, ["igName", "customerName"]) || "Customer"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {formatDateTime(pickString(order, ["createdAt", "updatedAt"]))}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <div className="space-y-6">
          <InstagramLinkPanel />

          <Panel title="Plan">
            <div className="rounded-[26px] border border-[var(--border)] bg-[linear-gradient(135deg,_rgba(10,132,255,0.14)_0%,_rgba(90,200,250,0.08)_100%)] px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Current subscription
              </p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {pickString(subscription, ["type", "name"]) || "Free"}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniMetric
                  label="Order limit"
                  value={formatNumber(pickNumber(subscription, ["orderLimit"]) ?? 0)}
                />
                <MiniMetric
                  label="Shop limit"
                  value={formatNumber(pickNumber(subscription, ["shopLimit"]) ?? 0)}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Signals">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <EmptyState message="Không có tín hiệu mới." compact />
              ) : (
                notifications.map((notification, index) => (
                  <article
                    key={`${pickString(notification, ["id", "_id"]) || index}`}
                    className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4"
                  >
                    <div className="flex items-center gap-2">
                      <Tag tone={pickBoolean(notification, ["isRead"]) ? "muted" : "blue"}>
                        {pickBoolean(notification, ["isRead"]) ? "Read" : "New"}
                      </Tag>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                      {pickString(notification, ["title", "message", "type"]) || "Notification"}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                      {pickString(notification, ["body", "content", "message"]) || "No details available."}
                    </p>
                  </article>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function LivestreamsScreen() {
  const { logout, patchSession, session } = useSession();
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [state, setState] = useState<AsyncState<unknown>>({
    status: "loading",
    data: null,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await proxyRequest(session, {
          path: "/lives/my-lives",
          query: {
            page: 1,
            limit: 12,
            search: search || undefined,
          },
        });

        if (cancelled) {
          return;
        }

        handleAuthSync([response.response], patchSession, logout);
        setState({
          status: "ready",
          data: response.data,
          error: "",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Unable to load livestreams.",
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [logout, patchSession, search, session]);

  const livestreams = extractCollection(state.data).map((live) => ({
    id: pickString(live, ["id", "_id"]) || pickString(live, ["igLiveId"]),
    title:
      pickString(asRecord(live.shop), ["name"]) ||
      pickString(live, ["igLiveId"]) ||
      "Livestream",
    isLive: pickBoolean(live, ["isLive"]) ?? false,
    comments: pickNumber(live, ["totalComment", "totalComments"]) ?? 0,
    orders: pickNumber(live, ["totalOrder", "totalOrders"]) ?? 0,
    updatedAt: pickString(live, ["lastWebhookAt", "updatedAt", "createdAt"]),
    owner:
      pickString(asRecord(live.user), ["fullName", "name"]) ||
      session.user?.fullName ||
      "Owner",
    igLiveId: pickString(live, ["igLiveId"]) || "instagram-live",
  }));

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <Hero
        label="Livestreams"
        title="Realtime sessions"
        description="Theo dõi từng phiên livestream, đi thẳng vào room comment và nhìn toàn cảnh luồng bán hàng tức thời."
      />

      <Panel
        title="All livestreams"
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search live"
            className={`${CONTROL_CLASS} w-full md:w-64`}
          />
        }
      >
        {state.status === "loading" ? <LoadingState /> : null}
        {state.status === "error" ? <ErrorState message={state.error} /> : null}
        {state.status === "ready" && livestreams.length === 0 ? (
          <EmptyState message="Không tìm thấy livestream nào." />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {livestreams.map((live) => (
            <Link
              key={live.id}
              href={`/livestreams/detail?liveId=${encodeURIComponent(live.id)}`}
              className="group rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 transition duration-300 hover:-translate-y-1 hover:border-[color:var(--primary-soft)] hover:shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-center justify-between gap-4">
                <Tag tone={live.isLive ? "blue" : "muted"}>
                  {live.isLive ? "Live" : "Paused"}
                </Tag>
                <span className="text-xs text-[var(--muted)]">
                  {formatDateTime(live.updatedAt)}
                </span>
              </div>

              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                {live.title}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{live.igLiveId}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniMetric label="Comments" value={formatNumber(live.comments)} />
                <MiniMetric label="Orders" value={formatNumber(live.orders)} />
                <MiniMetric label="Owner" value={live.owner} />
                <MiniMetric label="Status" value={live.isLive ? "Active" : "Standby"} />
              </div>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export function LiveDetailScreen({ liveId }: { liveId: string }) {
  const { logout, patchSession, session } = useSession();
  const [liveState, setLiveState] = useState<AsyncState<unknown>>({
    status: "loading",
    data: null,
    error: "",
  });
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [streamState, setStreamState] = useState<"connecting" | "live" | "stopped" | "error">("connecting");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [liveResponse, commentsResponse] = await Promise.all([
          proxyRequest(session, { path: `/lives/${liveId}` }),
          proxyRequest(session, {
            path: `/comments/live/${liveId}/cursor`,
            query: { limit: 20, direction: "next" },
          }),
        ]);

        if (cancelled) {
          return;
        }

        handleAuthSync([liveResponse.response, commentsResponse.response], patchSession, logout);

        setLiveState({
          status: "ready",
          data: liveResponse.data,
          error: "",
        });
        setComments(extractCollection(commentsResponse.data));
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLiveState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Unable to load livestream.",
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [liveId, logout, patchSession, session]);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    startTransition(() => {
      setStreamState("connecting");
    });

    streamProxyRequest(
      session,
      { path: `/comments/live/${liveId}/stream` },
      (event) => {
        startTransition(() => {
          setStreamState("live");
        });

        const payload = safelyParseEvent(event.data);
        const nextComment = asRecord(payload.comment);
        if (Object.keys(nextComment).length === 0) {
          return;
        }

        setComments((current) => dedupeComments([nextComment, ...current]).slice(0, 40));
      },
      controller.signal,
    )
      .then((response) => {
        if (!response) {
          return;
        }

        handleAuthSync([response], patchSession, logout);
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
      <Hero
        label="Live Room"
        title={liveTitle}
        description="Comment feed chạy realtime để đội sale nắm đơn, bắt tín hiệu khách hàng và phản ứng ngay trong luồng live."
      />

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
          {comments.length === 0 ? <EmptyState message="Chưa có comment realtime." /> : null}

          <div className="max-h-[760px] space-y-3 overflow-y-auto pr-1">
            {comments.map((comment, index) => (
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
                          comments.length,
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
                        pickString(live, ["lastWebhookAt", "updatedAt"]),
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
              <MiniMetric label="Comments" value={formatNumber(pickNumber(live, ["totalComment", "totalComments"]) ?? comments.length)} />
              <MiniMetric label="Orders" value={formatNumber(pickNumber(live, ["totalOrder", "totalOrders"]) ?? 0)} />
              <MiniMetric label="Last activity" value={formatDateTime(pickString(live, ["lastWebhookAt", "updatedAt"]))} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

export function OrdersScreen() {
  const { logout, patchSession, session } = useSession();
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [state, setState] = useState<AsyncState<unknown>>({
    status: "loading",
    data: null,
    error: "",
  });
  const [exportState, setExportState] = useState("");
  const [range, setRange] = useState({
    startDate: "2026-03-01",
    endDate: "2026-03-31",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await proxyRequest(session, {
          path: "/orders/user/my-orders",
          query: {
            page: 1,
            limit: 20,
            search: search || undefined,
          },
        });

        if (cancelled) {
          return;
        }

        handleAuthSync([response.response], patchSession, logout);

        setState({
          status: "ready",
          data: response.data,
          error: "",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Unable to load orders.",
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [logout, patchSession, search, session]);

  const orders = extractCollection(state.data);
  const effectiveSelectedOrderId =
    selectedOrderId || pickString(orders[0], ["id", "_id", "orderCode"]);
  const selectedOrder =
    orders.find(
      (order) =>
        pickString(order, ["id", "_id", "orderCode"]) === effectiveSelectedOrderId,
    ) ?? orders[0] ?? null;
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (pickNumber(order, ["totalPrice", "amount"]) ?? 0),
    0,
  );
  const totalDeposit = orders.reduce(
    (sum, order) => sum + (pickNumber(order, ["deposit"]) ?? 0),
    0,
  );

  async function handleExport() {
    const response = await proxyDownload(session, {
      path: "/orders/export/excel",
      query: range,
    });

    handleAuthSync([response.response], patchSession, logout);

    if (!response.ok) {
      setExportState("Export failed");
      URL.revokeObjectURL(response.url);
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = response.url;
    anchor.download = response.filename;
    anchor.click();

    setExportState(response.filename);
    window.setTimeout(() => URL.revokeObjectURL(response.url), 30000);
  }

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <Hero
        label="Orders"
        title="Commerce operations"
        description="Theo dõi doanh thu trên trang hiện tại, rà soát đơn hàng và xuất dữ liệu cho đội vận hành."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Orders" value={orders.length} accent="blue" />
        <StatCard label="Revenue" value={formatCurrency(totalRevenue)} accent="cyan" />
        <StatCard label="Deposit" value={formatCurrency(totalDeposit)} accent="slate" />
      </div>

      <Panel
        title="Orders"
        action={
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order"
              className={CONTROL_CLASS}
            />
            <input
              type="date"
              value={range.startDate}
              onChange={(event) =>
                setRange((current) => ({ ...current, startDate: event.target.value }))
              }
              className={CONTROL_CLASS}
            />
            <input
              type="date"
              value={range.endDate}
              onChange={(event) =>
                setRange((current) => ({ ...current, endDate: event.target.value }))
              }
              className={CONTROL_CLASS}
            />
            <button
              type="button"
              onClick={handleExport}
              className={PRIMARY_BUTTON_CLASS}
            >
              Export
            </button>
          </div>
        }
      >
        {exportState ? (
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--muted)]">
            {exportState}
          </div>
        ) : null}

        {state.status === "loading" ? <LoadingState /> : null}
        {state.status === "error" ? <ErrorState message={state.error} /> : null}
        {state.status === "ready" && orders.length === 0 ? (
          <EmptyState message="Không có đơn hàng phù hợp." />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-3">
            {orders.map((order, index) => (
              <button
                key={`${pickString(order, ["id", "_id", "orderCode"]) || index}`}
                type="button"
                onClick={() =>
                  setSelectedOrderId(pickString(order, ["id", "_id", "orderCode"]))
                }
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  effectiveSelectedOrderId ===
                  pickString(order, ["id", "_id", "orderCode"])
                    ? "border-[color:var(--primary-soft)] bg-[var(--surface)] shadow-[var(--shadow-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-strong)] hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {pickString(order, ["orderCode", "code"]) || "Order"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {pickString(order, ["igName", "customerName"]) || "Customer"}
                    </p>
                  </div>
                  <Tag tone={(pickNumber(order, ["deposit"]) ?? 0) > 0 ? "blue" : "muted"}>
                    {formatCurrency(pickNumber(order, ["deposit"]) ?? 0)}
                  </Tag>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <MiniMetric
                    label="Total"
                    value={formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}
                  />
                  <MiniMetric
                    label="Created"
                    value={formatDateTime(pickString(order, ["createdAt", "updatedAt"]))}
                  />
                </div>
              </button>
            ))}
          </div>

          <PanelInset title="Focus order">
            {!selectedOrder ? (
              <EmptyState message="Chưa có đơn hàng để hiển thị." compact />
            ) : (
              <div className="space-y-3">
                <MiniMetric label="Order code" value={pickString(selectedOrder, ["orderCode", "code"]) || "Order"} />
                <MiniMetric label="Customer" value={pickString(selectedOrder, ["igName", "customerName"]) || "Customer"} />
                <MiniMetric label="Phone" value={pickString(selectedOrder, ["phone"]) || "No phone"} />
                <MiniMetric label="Deposit" value={formatCurrency(pickNumber(selectedOrder, ["deposit"]) ?? 0)} />
                <MiniMetric label="Total" value={formatCurrency(pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0)} />
                <MiniMetric label="Created" value={formatDateTime(pickString(selectedOrder, ["createdAt", "updatedAt"]))} />
              </div>
            )}
          </PanelInset>
        </div>
      </Panel>
    </div>
  );
}

export function CustomersScreen() {
  const { logout, patchSession, session } = useSession();
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [state, setState] = useState<AsyncState<unknown>>({
    status: "loading",
    data: null,
    error: "",
  });
  const [detailState, setDetailState] = useState<AsyncState<unknown>>({
    status: "idle",
    data: null,
    error: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await proxyRequest(session, {
          path: "/customers/user/my-customers",
          query: {
            page: 1,
            limit: 20,
            search: search || undefined,
          },
        });

        if (cancelled) {
          return;
        }

        handleAuthSync([response.response], patchSession, logout);
        setState({
          status: "ready",
          data: response.data,
          error: "",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Unable to load customers.",
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [logout, patchSession, search, session]);

  const customers = extractCollection(state.data);
  const effectiveSelectedCustomerId =
    selectedCustomerId || pickString(customers[0], ["id", "_id"]);

  useEffect(() => {
    if (!effectiveSelectedCustomerId) {
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      try {
        const response = await proxyRequest(session, {
          path: `/customers/${effectiveSelectedCustomerId}`,
          query: { includeHistories: true },
        });

        if (cancelled) {
          return;
        }

        handleAuthSync([response.response], patchSession, logout);
        setDetailState({
          status: "ready",
          data: response.data,
          error: "",
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        setDetailState({
          status: "error",
          data: null,
          error: error instanceof Error ? error.message : "Unable to load customer detail.",
        });
      }
    }

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [effectiveSelectedCustomerId, logout, patchSession, session]);

  const detail = asRecord(extractApiData(detailState.data));
  const tags = extractCollection(detail.tags);
  const histories = extractCollection(detail.histories);

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <Hero
        label="Customers"
        title="Relationship layer"
        description="Tập trung vào hồ sơ khách hàng, nhịp độ mua hàng và những tín hiệu đáng chú ý để chăm sóc đúng lúc."
      />

      <Panel
        title="Customer base"
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer"
            className={`${CONTROL_CLASS} w-full md:w-64`}
          />
        }
      >
        {state.status === "loading" ? <LoadingState /> : null}
        {state.status === "error" ? <ErrorState message={state.error} /> : null}
        {state.status === "ready" && customers.length === 0 ? (
          <EmptyState message="Chưa có khách hàng phù hợp." />
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
          <div className="space-y-3">
            {customers.map((customer, index) => (
              <button
                key={`${pickString(customer, ["id", "_id"]) || index}`}
                type="button"
                onClick={() =>
                  setSelectedCustomerId(pickString(customer, ["id", "_id"]))
                }
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  effectiveSelectedCustomerId === pickString(customer, ["id", "_id"])
                    ? "border-[color:var(--primary-soft)] bg-[var(--surface)] shadow-[var(--shadow-soft)]"
                    : "border-[var(--border)] bg-[var(--surface-strong)] hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">
                      {pickString(customer, ["igName", "name"]) || "Customer"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {pickString(customer, ["phone"]) || "No phone"}
                    </p>
                  </div>
                  <Tag tone="muted">
                    {formatDateTime(pickString(customer, ["updatedAt", "createdAt"]))}
                  </Tag>
                </div>
                <p className="mt-4 text-sm text-[var(--muted)]">
                  {compactAddress(customer) || "No address"}
                </p>
              </button>
            ))}
          </div>

          <PanelInset title="Customer profile">
            {detailState.status === "idle" || detailState.status === "loading" ? (
              <LoadingState compact />
            ) : detailState.status === "error" ? (
              <ErrorState message={detailState.error} compact />
            ) : (
              <div className="space-y-3">
                <MiniMetric label="Instagram" value={pickString(detail, ["igName", "name"]) || "Customer"} />
                <MiniMetric label="Phone" value={pickString(detail, ["phone"]) || "No phone"} />
                <MiniMetric label="Birthday" value={formatDateTime(pickString(detail, ["dayOfBirth"]))} />
                <MiniMetric label="Address" value={compactAddress(detail) || "No address"} />
                <MiniMetric label="Notes" value={pickString(detail, ["note"]) || "No notes"} />
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    Tags
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.length === 0 ? (
                      <Tag tone="muted">No tags</Tag>
                    ) : (
                      tags.map((tag, index) => (
                        <Tag key={`${pickString(tag, ["id", "_id"]) || index}`} tone="blue">
                          {pickString(tag, ["label", "name"]) || "Tag"}
                        </Tag>
                      ))
                    )}
                  </div>
                </div>
                <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    Recent history
                  </p>
                  <div className="mt-3 space-y-2">
                    {histories.length === 0 ? (
                      <EmptyState message="Chưa có lịch sử nào." compact />
                    ) : (
                      histories.slice(0, 4).map((history, index) => (
                        <div
                          key={`${pickString(history, ["id", "_id"]) || index}`}
                          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-sm text-[var(--foreground-soft)]"
                        >
                          {pickString(history, ["title", "action", "type", "note"]) || "Customer activity"}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </PanelInset>
        </div>
      </Panel>
    </div>
  );
}

function Hero({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <section className="overflow-hidden rounded-[36px] border border-[var(--border)] bg-[linear-gradient(140deg,_rgba(10,132,255,0.14)_0%,_rgba(90,200,250,0.08)_36%,_var(--surface-strong)_100%)] px-6 py-7 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:px-8 md:py-8 lg:px-9 lg:py-9">
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
        {label}
      </p>
      <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-[var(--foreground)] md:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--foreground-soft)] md:text-base">
        {description}
      </p>
    </section>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:px-6 md:py-6 lg:px-7 lg:py-7">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PanelInset({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,_var(--surface-strong)_0%,_var(--surface)_100%)] px-4 py-4 shadow-[var(--shadow-soft)] md:px-5 md:py-5">
      <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: Primitive;
  accent: "blue" | "cyan" | "indigo" | "slate";
}) {
  const accentClass = {
    blue: "from-[rgba(10,132,255,0.18)] to-transparent",
    cyan: "from-[rgba(90,200,250,0.18)] to-transparent",
    indigo: "from-[rgba(88,86,214,0.18)] to-transparent",
    slate: "from-[rgba(148,163,184,0.16)] to-transparent",
  }[accent];

  return (
    <article className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,_var(--surface-strong)_0%,_var(--surface)_100%)] px-5 py-5 shadow-[var(--shadow-soft)]">
      <div className={`rounded-[24px] bg-gradient-to-br ${accentClass} px-1 py-1`}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          {label}
        </p>
        <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">
          {typeof value === "number" ? formatNumber(value) : String(value)}
        </p>
      </div>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: Primitive }) {
  return (
    <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-7 text-[var(--foreground)]">
        {String(value)}
      </p>
    </div>
  );
}

function Tag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "muted" | "danger";
}) {
  const tones = {
    blue: "bg-[rgba(10,132,255,0.14)] text-[var(--primary)]",
    muted: "bg-[var(--surface-muted)] text-[var(--muted)]",
    danger: "bg-[rgba(255,69,58,0.14)] text-[rgb(255,69,58)]",
  }[tone];

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tones}`}>
      {children}
    </span>
  );
}

function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={SECONDARY_BUTTON_CLASS}
    >
      {label}
    </Link>
  );
}

function LoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] ${compact ? "px-4 py-4 text-sm" : "mb-4 px-4 py-5 text-sm"}`}>
      Loading…
    </div>
  );
}

function ErrorState({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[24px] border border-[rgba(255,69,58,0.24)] bg-[rgba(255,69,58,0.08)] text-[rgb(255,69,58)] ${compact ? "px-4 py-4 text-sm" : "mb-4 px-4 py-5 text-sm"}`}>
      {message}
    </div>
  );
}

function EmptyState({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] ${compact ? "px-4 py-4 text-sm" : "px-4 py-5 text-sm"}`}>
      {message}
    </div>
  );
}

function CompanionMetric({
  label,
  value,
}: {
  label: string;
  value: Primitive;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/52">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{String(value)}</p>
    </div>
  );
}

function compactMetric(value: unknown) {
  const record = asRecord(value);
  const primary =
    pickNumber(record, [
      "total",
      "count",
      "value",
      "totalOrders",
      "totalComments",
      "totalLives",
      "totalCustomers",
    ]) ?? 0;

  return {
    primary,
  };
}

function safelyParseEvent(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
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

function compactAddress(value: unknown) {
  const record = asRecord(value);
  return [
    pickString(record, ["street"]),
    pickString(record, ["ward"]),
    pickString(record, ["province"]),
  ]
    .filter(Boolean)
    .join(", ");
}

function resolveInstagramHandle(
  live: Record<string, unknown>,
  shop: Record<string, unknown>,
  user: Record<string, unknown>,
) {
  const handle = [
    pickString(live, ["igUsername", "instagramUsername", "username"]),
    pickString(shop, ["igUsername", "instagramUsername", "username"]),
    pickString(user, ["igUsername", "instagramUsername", "username"]),
  ].find(Boolean);

  return normalizeInstagramHandle(handle ?? "");
}

function buildInstagramUrl(handle: string) {
  if (!handle) {
    return "https://www.instagram.com/";
  }

  return `https://www.instagram.com/${handle}/`;
}

function normalizeInstagramHandle(value: string) {
  return value.trim().replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
}

function compactDate(value: string) {
  if (!value) {
    return "No data";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatStreamState(value: "connecting" | "live" | "stopped" | "error") {
  return {
    connecting: "Connecting",
    live: "Live",
    stopped: "Stopped",
    error: "Error",
  }[value];
}

function handleAuthSync(
  responses: Response[],
  patchSession: (patch: Partial<SessionSettings>) => void,
  logout: () => Promise<void>,
) {
  const refreshedAccessToken = responses
    .map((response) => response.headers.get("x-refreshed-access-token"))
    .find(Boolean);

  if (refreshedAccessToken) {
    patchSession({
      accessToken: refreshedAccessToken,
    });
  }

  if (responses.some((response) => response.status === 401)) {
    void logout();
  }
}
