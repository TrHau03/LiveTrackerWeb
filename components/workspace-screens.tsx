"use client";

import Link from "next/link";
import React, { startTransition, useDeferredValue, useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

import { InstagramLinkPanel } from "@/components/instagram-link-panel";
import { useSession } from "@/components/session-provider";
import {
  asRecord,
  extractApiData,
  extractCollection,
  formatCurrency,
  formatDateTime,
  formatLiveDateTime,
  formatTimeOnly,
  formatNumber,
  pickBoolean,
  pickNumber,
  pickString,
  proxyDownload,
  proxyRequest,
  streamProxyRequest,
} from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";

// ─── New Service & Hook imports ──────────────────────────────────────────────
import { useDashboard } from "@/hooks/use-dashboard";
import { useLives } from "@/hooks/use-lives";
import { useOrders, useLiveOrders, useExportOrders } from "@/hooks/use-orders";
import { useCommentsStream } from "@/hooks/use-comments";
import type { LiveStats } from "@/hooks/use-comments";
import { useCustomers, useCustomerDetail } from "@/hooks/use-customers";
import { useTags } from "@/hooks/use-tags";
import { PrintTemplate } from "@/components/printer/print-template";
import { useSettingsStore } from "@/stores/settings-store";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { createOrder, deleteOrder as deleteOrderApi, removeCommentFromOrder } from "@/lib/services/orders-service";
import { updateComment, linkBackup, unlinkBackup, updateCustomerTag } from "@/lib/services/comments-service";
import { detectLive } from "@/lib/services/lives-service";
import { useQueryClient } from "@tanstack/react-query";

type AsyncState<T> = {
  status: "idle" | "loading" | "ready" | "error";
  data: T | null;
  error: string;
};

type Primitive = string | number | boolean | null | undefined;

const CONTROL_CLASS =
  "h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]";
const PRIMARY_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--primary-strong)] disabled:opacity-50";
const SECONDARY_BUTTON_CLASS =
  "inline-flex h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:bg-[var(--surface-muted)] disabled:opacity-50";

export function DashboardScreen() {
  const { session } = useSession();
  const { data, status, error: queryError } = useDashboard();

  const state = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data || null,
    error: queryError ? queryError.message : "",
  }

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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Save Products"
          value={178}
          icon={<HeartIcon />}
          iconBg="bg-[#eef2ff]"
          iconColor="text-[#1447E6]"
        />
        <StatCard
          label="Stock Products"
          value={20}
          icon={<HomeIcon />}
          iconBg="bg-[#fff9e6]"
          iconColor="text-[#ffc107]"
        />
        <StatCard
          label="Sales Products"
          value={190}
          icon={<BagIcon />}
          iconBg="bg-[#fff0e6]"
          iconColor="text-[#ff8a00]"
        />
        <StatCard
          label="Job Application"
          value={12}
          icon={<BriefcaseIcon />}
          iconBg="bg-[#f3e8ff]"
          iconColor="text-[#a855f7]"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[7fr_3fr]">
        <Panel title="Reports" action={<span className="text-[var(--muted)] underline cursor-pointer">...</span>}>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { name: '10am', value: 55 },
                { name: '11am', value: 30 },
                { name: '12am', value: 65 },
                { name: '01am', value: 35 },
                { name: '02am', value: 40 },
                { name: '03am', value: 50 },
                { name: '04am', value: 20 },
                { name: '05am', value: 35 },
                { name: '06am', value: 70 },
                { name: '07am', value: 55 },
              ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1447E6" />
                    <stop offset="100%" stopColor="#f472b6" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg bg-black p-2 text-white shadow-lg">
                          <p className="text-[10px] opacity-70">Sales</p>
                          <p className="text-xs font-bold">{formatNumber(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="url(#lineGradient)" strokeWidth={3} fill="transparent" dot={{ r: 4, fill: '#fff', stroke: '#1447E6', strokeWidth: 2 }} activeDot={{ r: 6, fill: '#1447E6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Analytics" action={<span className="text-[var(--muted)] underline cursor-pointer">...</span>}>
          <div className="flex h-[300px] flex-col items-center justify-center">
            <div className="relative flex h-48 w-48 items-center justify-center">
              {/* Simplified Donut Chart via SVG */}
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f4f9" strokeWidth="12" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#1447E6" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="50" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ff8a00" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="180" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ffc107" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="220" />
              </svg>
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-3xl font-bold text-[var(--foreground)]">80%</span>
                <span className="text-[10px] font-medium text-[var(--muted)]">Transactions</span>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-[10px] font-semibold">
              <div className="flex items-center gap-2 text-[var(--foreground)]"><span className="h-2 w-2 rounded-full bg-[#1447E6]"></span> Sale</div>
              <div className="flex items-center gap-2 text-[var(--foreground)]"><span className="h-2 w-2 rounded-full bg-[#ffc107]"></span> Distribute</div>
              <div className="flex items-center gap-2 text-[var(--foreground)]"><span className="h-2 w-2 rounded-full bg-[#ff8a00]"></span> Return</div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[7fr_3fr]">
        <Panel title="Recent Orders" action={<span className="text-[var(--muted)] underline cursor-pointer">...</span>} className="h-full">
          {state.status === "loading" ? <LoadingState /> : null}
          {state.status === "error" ? <ErrorState message={state.error} /> : null}

          <div className="-mx-5 -mb-5 mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Tracking no</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Product Name</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Price</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider text-center">Total Order</th>
                  <th className="px-5 py-4 font-semibold uppercase tracking-wider">Total Amount</th>
                </tr>
              </thead>
              <tbody className="">
                {recentOrders.map((order, index) => (
                  <tr key={`${pickString(order, ["id", "_id", "orderCode"]) || index}`} className="transition border-t border-[var(--border)]">
                    <td className="px-5 py-4 font-medium text-[var(--foreground)] opacity-70">#{pickString(order, ["orderCode", "code"])?.slice(-6) || "876364"}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-[var(--background)] flex items-center justify-center p-1.5">
                          <img src="/favicon.png" className="h-full w-auto object-contain opacity-40grayscale" />
                        </div>
                        <span className="font-semibold text-[var(--foreground)]">{pickString(order, ["igName", "customerName"]) || "Product"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[var(--foreground)] font-medium opacity-80">${pickNumber(order, ["price"]) || "178"}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-block px-4 py-1.5 bg-[#e1f9fe] text-[#00c2e0] font-bold rounded-md">
                        {pickNumber(order, ["quantity"]) || 325}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-[var(--foreground)]">${formatNumber(pickNumber(order, ["totalPrice", "amount"]) || 146660)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Revenue Summary" action={<span className="text-[var(--muted)] underline cursor-pointer">...</span>}>
          <div className="space-y-6">
            {[
              { name: "NIKE Shoes Black Pattern", price: 87, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&h=100&fit=crop" },
              { name: "iPhone 12", price: 987, img: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=100&h=100&fit=crop" }
            ].map((product, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-xl bg-[var(--background)]">
                  <img src={product.img} alt={product.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-[var(--foreground)]">{product.name}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map(s => <svg key={s} className="h-3 w-3 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                  </div>
                  <p className="mt-1 text-sm font-bold text-[var(--foreground)]">${product.price}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function LivestreamsScreen() {
  const activeLiveId = useSettingsStore(state => state.activeLiveId);
  const setActiveLiveId = useSettingsStore(state => state.setActiveLiveId);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const setCommentDisplayOrder = useSettingsStore(state => state.setCommentDisplayOrder);
  const [liveStats, setLiveStats] = useState<LiveStats>({ totalOrder: 0, totalComment: 0, totalItems: 0 });

  // Reset mobile view when selecting a live
  const handleSelectLive = (id: string) => {
    setActiveLiveId(id);
    setMobileView("detail");
    setLiveStats({ totalOrder: 0, totalComment: 0, totalItems: 0 });
  };

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden pb-4">
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
        {/* Left Column: List (Hidden on mobile detail) */}
        <div className={`flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] transition-all duration-300 ${mobileView === "list" ? "w-full lg:w-[25%]" : "hidden lg:flex lg:w-[25%]"
          }`}>
          <LiveListColumn activeLiveId={activeLiveId} onSelectLive={handleSelectLive} liveStats={liveStats} />
        </div>

        {/* Detail Views (Combined on mobile, separate on desktop) */}
        <div className={`flex-1 flex min-h-0 gap-4 overflow-hidden transition-all duration-300 ${mobileView === "detail" ? "w-full flex-col lg:flex-row" : "hidden lg:flex"
          }`}>
          {/* Middle Column: Comments */}
          <div className="flex flex-col flex-[1.5] min-h-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] overflow-hidden">
            {activeLiveId ? (
              <div className="flex flex-col h-full">
                <div className="lg:hidden p-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/30">
                  <button
                    onClick={() => setMobileView("list")}
                    className="flex items-center gap-2 text-sm font-bold text-[var(--primary)]"
                  >
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

          {/* Right Column: Orders */}
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

function LiveListColumn({ activeLiveId, onSelectLive, liveStats }: { activeLiveId: string | null; onSelectLive: (id: string) => void; liveStats: LiveStats }) {
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

  // Auto-select the first (most recent) live on first load if none selected
  useEffect(() => {
    if (livestreams.length > 0 && !activeLiveId && !query) {
      onSelectLive(livestreams[0].id);
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
            // Use SSE stats for the active live, API data for others
            const displayComments = isActive && liveStats.totalComment > 0 ? liveStats.totalComment : live.comments;
            const displayOrders = isActive && liveStats.totalOrder > 0 ? liveStats.totalOrder : live.orders;
            return (
              <button
                key={live.id}
                onClick={() => onSelectLive(live.id)}
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
                  {formatLiveDateTime(live.updatedAt)}
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

function CustomerTagDropdown({ commentId, currentTag, session, queryClient }: { commentId: string; currentTag: string; session: any; queryClient: any }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { data: tagsData } = useTags();
  const tags = extractCollection(tagsData);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = async (tagLabel: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await updateCustomerTag(session, commentId, tagLabel);
      applyAuthResponses([res.response], () => {}, async () => {});
    } catch { /* ignore */ }
    setLoading(false);
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className={`flex h-5 w-5 items-center justify-center rounded transition-colors ${currentTag ? 'text-purple-500 hover:text-purple-700' : 'text-[var(--muted)] hover:text-[var(--foreground)]'}`}
        title="Gán nhãn khách hàng"
      >
        <svg className="h-3 w-3" fill={currentTag ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {tags.length === 0 && (
            <div className="px-3 py-2 text-[10px] text-[var(--muted)]">Chưa có tag</div>
          )}
          {tags.map((tag, idx) => {
            const label = pickString(tag, ["label", "name"]);
            const color = pickString(tag, ["color"]) || "#8b5cf6";
            return (
              <button
                key={pickString(tag, ["id", "_id"]) || idx}
                onClick={(e) => { e.stopPropagation(); handleSelect(label); }}
                disabled={loading}
                className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold hover:bg-[var(--surface-muted)] transition-colors flex items-center gap-2 disabled:opacity-50 ${currentTag === label ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                {label}
              </button>
            );
          })}
          {currentTag && (
            <button
              onClick={(e) => { e.stopPropagation(); handleSelect(""); }}
              disabled={loading}
              className="w-full text-left px-3 py-1.5 text-[11px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 border-t border-[var(--border)] mt-1 pt-1.5 disabled:opacity-50"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              Bỏ tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function LiveCommentColumn({ liveId, onLiveStatsUpdate }: { liveId: string; onLiveStatsUpdate?: (stats: LiveStats) => void }) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const { comments, streamState, hasMore, isLoadingMore, fetchMoreComments, liveStats } = useCommentsStream(liveId);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  // Push liveStats up to parent whenever they change
  useEffect(() => {
    if (onLiveStatsUpdate && (liveStats.totalComment > 0 || liveStats.totalOrder > 0)) {
      onLiveStatsUpdate(liveStats);
    }
  }, [liveStats, onLiveStatsUpdate]);
  // ── Action handlers ──
  const handleCreateOrder = async (comment: Record<string, unknown>, actionType: "NORMAL" | "BACKUP" | "CONFIRMED_ERROR") => {
    const commentId = pickString(comment, ["id", "_id"]);
    if (!commentId || actionLoading[commentId]) return;
    setActionLoading((prev) => ({ ...prev, [commentId]: actionType }));
    try {
      const res = await createOrder(session, {
        commentId,
        igId: pickString(comment, ["igUserId", "igId"]),
        igName: pickString(comment, ["igUsername", "username"]),
        liveId,
        actionType,
      });
      applyAuthResponses([res.response], () => {}, async () => {});
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    } catch { /* ignore */ }
    setActionLoading((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
  };

  const handleLinkBackup = async (comment: Record<string, unknown>) => {
    const commentId = pickString(comment, ["id", "_id"]);
    if (!commentId || actionLoading[commentId]) return;
    setActionLoading((prev) => ({ ...prev, [commentId]: "BACKUP" }));
    try {
      const res = await linkBackup(session, commentId);
      applyAuthResponses([res.response], () => {}, async () => {});
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    } catch { /* ignore */ }
    setActionLoading((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
  };

  const handleUnlinkBackup = async (comment: Record<string, unknown>) => {
    const commentId = pickString(comment, ["id", "_id"]);
    if (!commentId || actionLoading[commentId]) return;
    setActionLoading((prev) => ({ ...prev, [commentId]: "UNLINK_BACKUP" }));
    try {
      const res = await unlinkBackup(session, commentId);
      applyAuthResponses([res.response], () => {}, async () => {});
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    } catch { /* ignore */ }
    setActionLoading((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
  };

  const handleCancelOrder = async (comment: Record<string, unknown>) => {
    const commentId = pickString(comment, ["id", "_id"]);
    const orderId = pickString(comment, ["orderId"]);
    if (!commentId || !orderId || actionLoading[commentId]) return;
    setActionLoading((prev) => ({ ...prev, [commentId]: "CANCEL" }));
    try {
      const res = await deleteOrderApi(session, orderId);
      applyAuthResponses([res.response], () => {}, async () => {});
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    } catch { /* ignore */ }
    setActionLoading((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
  };

  const handleAddQuantity = async (comment: Record<string, unknown>) => {
    const commentId = pickString(comment, ["id", "_id"]);
    if (!commentId || actionLoading[commentId]) return;
    setActionLoading((prev) => ({ ...prev, [commentId]: "ADD_QTY" }));
    try {
      const currentQty = pickNumber(comment, ["quantity"]) ?? 1;
      const res = await updateComment(session, commentId, {
        quantity: currentQty + 1,
        liveId,
        customerId: pickString(comment, ["customerId"]),
      });
      applyAuthResponses([res.response], () => {}, async () => {});
    } catch { /* ignore */ }
    setActionLoading((prev) => { const n = { ...prev }; delete n[commentId]; return n; });
  };

  const ItemContent = (index: number, comment: any) => {
    const igUsername = pickString(comment, ["igUsername", "username"]) || "Instagram user";
    const commentId = pickString(comment, ["id", "_id"]);
    const status = pickString(comment, ["status", "type"]).toUpperCase();
    const customerTag = pickString(comment, ["customerTag"]);
    const closedCount = pickNumber(comment, ["customerClosedCount"]);
    const isNew = pickBoolean(comment, ["isNewCustomer"]);
    const loading = actionLoading[commentId];

    return (
      <div className={`relative flex gap-3 rounded-xl border p-2.5 shadow-[var(--shadow-soft)] mx-3 my-1.5 transition hover:shadow-md ${
        status === "NORMAL" ? "border-green-200 bg-green-50/30 dark:border-green-800/40 dark:bg-green-900/10" :
        status === "BACKUP" ? "border-amber-200 bg-amber-50/30 dark:border-amber-800/40 dark:bg-amber-900/10" :
        status === "CONFIRMED_ERROR" ? "border-red-200 bg-red-50/30 dark:border-red-800/40 dark:bg-red-900/10 opacity-60" :
        "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)]"
      }`}>
        {/* Left: Avatar */}
        <div className="flex-shrink-0 pt-0.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--primary-soft)] text-xs font-bold text-[var(--primary)]">
            {igUsername.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Right: Content container */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-semibold text-[var(--foreground)] hover:underline cursor-pointer transition-colors hover:text-[var(--primary)] truncate">
                {igUsername}
              </span>
              {customerTag && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 shrink-0">
                  {customerTag}
                </span>
              )}
              {isNew && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
                  🆕 Mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <CustomerTagDropdown commentId={commentId} currentTag={customerTag} session={session} queryClient={queryClient} />
              <span className="text-[10px] font-medium text-[var(--muted)] whitespace-nowrap">
                {formatTimeOnly(pickString(comment, ["createdAt", "updatedAt"]))}
              </span>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-[var(--foreground-soft)] whitespace-pre-wrap break-words">
            {pickString(comment, ["text", "content", "message"]) || "No text"}
          </p>

          {/* Customer closed count badge */}
          {closedCount !== null && closedCount > 0 && (
            <div className="flex items-center gap-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--foreground-soft)]">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                Đã chốt: {closedCount} SP
              </span>
            </div>
          )}

          {/* Action buttons based on status */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {(!status || status === "" || status === "PENDING") && (
              <>
                <button
                  disabled={!!loading}
                  onClick={() => handleCreateOrder(comment, "NORMAL")}
                  className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-[var(--primary-strong)] transition active:scale-95 shrink-0 disabled:opacity-50"
                >
                  {loading === "NORMAL" ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                  Chốt đơn
                </button>
                <button
                  disabled={!!loading}
                  onClick={() => handleCreateOrder(comment, "CONFIRMED_ERROR")}
                  className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-95 shrink-0 disabled:opacity-50"
                >
                  {loading === "CONFIRMED_ERROR" ? <span className="h-3 w-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  Đã báo lỗi
                </button>
                <button
                  disabled={!!loading}
                  onClick={() => handleLinkBackup(comment)}
                  className="flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[10px] font-medium text-[var(--muted)] shadow-sm hover:bg-[var(--surface-muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)] transition active:scale-95 shrink-0 disabled:opacity-50"
                >
                  {loading === "BACKUP" ? <span className="h-3 w-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" /> : <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  Dự bị
                </button>
              </>
            )}

            {(status === "NORMAL" || status === "CONFIRMED_ERROR") && (
              <>
                <button
                  disabled={!!loading}
                  onClick={() => handleCancelOrder(comment)}
                  className="flex items-center gap-1.5 rounded-md bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-red-600 transition active:scale-95 shrink-0 disabled:opacity-50"
                >
                  {loading === "CANCEL" ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                  Huỷ chốt
                </button>
                <button
                  disabled={!!loading}
                  onClick={() => handleAddQuantity(comment)}
                  className="flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-700 shadow-sm hover:bg-green-100 transition active:scale-95 shrink-0 disabled:opacity-50 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300"
                >
                  {loading === "ADD_QTY" ? <span className="h-3 w-3 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" /> : <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>}
                  In thêm
                </button>
              </>
            )}

            {status === "BACKUP" && (
              <button
                disabled={!!loading}
                onClick={() => handleUnlinkBackup(comment)}
                className="flex items-center gap-1.5 rounded-md bg-amber-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition active:scale-95 shrink-0 disabled:opacity-50"
              >
                {loading === "UNLINK_BACKUP" ? <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>}
                Huỷ dự bị
              </button>
            )}

            {status === "CONFIRMED_ERROR" && (
              <span className="flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400 shrink-0">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Đã xác nhận lỗi
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const commentDisplayOrder = useSettingsStore(state => state.commentDisplayOrder);
  const setCommentDisplayOrder = useSettingsStore(state => state.setCommentDisplayOrder);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const [firstItemIndex, setFirstItemIndex] = useState(10000);
  const prevDisplayCommentsRef = useRef<any[]>([]);

  const displayComments = commentDisplayOrder === "newest_at_top"
    ? [...comments].reverse()
    : comments;

  const isNewestAtBottom = commentDisplayOrder === "newest_at_bottom";

  // Reset states when switching lives or display order
  useEffect(() => {
    setAtBottom(true);
    setAtTop(true);
    setFirstItemIndex(10000);
    prevDisplayCommentsRef.current = [];
  }, [liveId, commentDisplayOrder]);

  // Adjust firstItemIndex when items are prepended to prevent scroll jumping
  useEffect(() => {
    const prev = prevDisplayCommentsRef.current;
    if (prev.length > 0 && displayComments.length > prev.length) {
      const getIdentity = (c: any) => pickString(c, ["id", "_id"]) || (pickString(c, ["createdAt"]) + pickString(c, ["text"]));
      const prevFirstId = getIdentity(prev[0]);
      
      const newIndex = displayComments.findIndex(c => getIdentity(c) === prevFirstId);
      
      if (newIndex > 0) {
        setFirstItemIndex(idx => idx - newIndex);
      }
    }
    prevDisplayCommentsRef.current = displayComments;
  }, [displayComments]);

  // SSE connection status badge
  const connectionBadge = streamState === "live"
    ? <span className="flex items-center gap-1.5 text-[10px] font-semibold text-green-600"><span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-[pulse_2s_ease-in-out_infinite]" />Đã kết nối</span>
    : streamState === "connecting"
    ? <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-500"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />Đang kết nối</span>
    : streamState === "error"
    ? <span className="flex items-center gap-1.5 text-[10px] font-semibold text-red-500"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Mất kết nối</span>
    : <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--muted)]"><span className="h-1.5 w-1.5 rounded-full bg-gray-400" />Đã dừng</span>;

  return (
    <div className="flex h-full flex-col relative w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Luồng bình luận</h3>
          {connectionBadge}
          {typeof liveStats.totalComment === 'number' && (
            <span className="text-[10px] font-bold text-[var(--muted)] bg-[var(--surface-muted)] rounded-full px-2 py-0.5" title="Tổng lượt bình luận">
              {formatNumber(liveStats.totalComment)} cmts
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setCommentDisplayOrder(isNewestAtBottom ? "newest_at_top" : "newest_at_bottom")}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-all"
            title="Đổi chiều hiển thị bình luận"
          >
            <svg className={`h-4 w-4 transition-transform duration-300 ${isNewestAtBottom ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {!isNewestAtBottom ? "Mới nhất ở trên" : "Mới nhất ở dưới"}
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative bg-[var(--surface-muted)]/10">
        {displayComments.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">
            Đang chờ bình luận mới...
          </div>
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
            startReached={isNewestAtBottom && !isLoadingMore && hasMore ? fetchMoreComments : undefined}
            endReached={!isNewestAtBottom && !isLoadingMore && hasMore ? fetchMoreComments : undefined}
            initialTopMostItemIndex={isNewestAtBottom ? displayComments.length - 1 : 0}
            followOutput={isNewestAtBottom ? (isAtBottom => isAtBottom ? 'smooth' : false) : false}
            components={{
              Header: () => isNewestAtBottom ? (
                <div className="py-3 text-center mb-2">
                  {!hasMore ? (
                    <span className="text-[10px] text-[var(--muted)] font-medium italic mx-4 block py-1 bg-[var(--surface-muted)]/50 rounded">--- Đã tải hết lịch sử ---</span>
                  ) : isLoadingMore ? (
                    <span className="text-[10px] font-bold text-[var(--primary)] animate-pulse">Đang tải...</span>
                  ) : (
                    <button onClick={fetchMoreComments} className="text-[10px] text-[var(--muted)] opacity-60 hover:text-[var(--primary)] hover:opacity-100 transition-colors cursor-pointer inline-block py-1 px-4">↑ Bấm hoặc cuộn để tải thêm</button>
                  )}
                </div>
              ) : null,
              Footer: () => !isNewestAtBottom ? (
                <div className="py-3 text-center mt-2">
                  {!hasMore ? (
                    <span className="text-[10px] text-[var(--muted)] font-medium italic mx-4 block py-1 bg-[var(--surface-muted)]/50 rounded">--- Đã tải hết lịch sử ---</span>
                  ) : isLoadingMore ? (
                    <span className="text-[10px] font-bold text-[var(--primary)] animate-pulse">Đang tải...</span>
                  ) : (
                    <button onClick={fetchMoreComments} className="text-[10px] text-[var(--muted)] opacity-60 hover:text-[var(--primary)] hover:opacity-100 transition-colors cursor-pointer inline-block py-1 px-4">↓ Bấm hoặc cuộn để tải thêm</button>
                  )}
                </div>
              ) : <div className="h-4" /> /* padding block */
            }}
          />
        )}

        {(!isNewestAtBottom ? !atTop : !atBottom) && displayComments.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <button
              onClick={() => {
                const behavior = 'smooth';
                if (isNewestAtBottom) {
                  virtuosoRef.current?.scrollToIndex({ index: 'LAST', behavior });
                } else {
                  virtuosoRef.current?.scrollToIndex({ index: 0, behavior });
                }
              }}
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-xs font-bold text-[var(--foreground)] shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-lg hover:-translate-y-0.5 transition-all active:translate-y-0"
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

function LiveOrderColumn({ liveId, liveStats }: { liveId: string; liveStats: LiveStats }) {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [customerPopupId, setCustomerPopupId] = useState<string | null>(null);
  const paperSize = useSettingsStore(state => state.paperSize) as "80mm" | "58mm" | "a5";

  const { data: customerDetailData } = useCustomerDetail(customerPopupId || "");
  const customerDetail = customerPopupId ? asRecord(extractApiData(customerDetailData)) : {};
  const customerTags = extractCollection(customerDetail.tags);
  const customerHistories = extractCollection(customerDetail.histories);

  const { data, status, error: queryError } = useLiveOrders(liveId);

  // Reset selectedOrderId when liveId changes
  useEffect(() => {
    setSelectedOrderId(null);
  }, [liveId]);

  const state = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data || null,
    error: queryError ? queryError.message : "",
  }

  const orders = extractCollection(state.data);
  const selectedOrder = orders.find((o) => pickString(o, ["id", "_id", "orderCode"]) === selectedOrderId);
  const totalAmount = orders.reduce((sum, order) => sum + (pickNumber(order, ["totalPrice", "amount"]) ?? 0), 0);

  const handleDeleteOrder = async () => {
    const orderId = pickString(selectedOrder!, ["id", "_id"]);
    if (!orderId || deleteLoading) return;
    setDeleteLoading(true);
    try {
      const res = await deleteOrderApi(session, orderId);
      applyAuthResponses([res.response], () => {}, async () => {});
      if (res.ok) {
        setSelectedOrderId(null);
        queryClient.invalidateQueries({ queryKey: ["live_orders"] });
      }
    } catch { /* ignore */ }
    setDeleteLoading(false);
  };

  const handleRemoveComment = async (commentId: string) => {
    const orderId = pickString(selectedOrder!, ["id", "_id"]);
    if (!orderId || !commentId) return;
    try {
      const res = await removeCommentFromOrder(session, orderId, commentId);
      applyAuthResponses([res.response], () => {}, async () => {});
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["live_orders"] });
    } catch { /* ignore */ }
  };

  return (
    <div className="flex h-full flex-col relative w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 shrink-0">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Đơn hàng đã chốt</h3>
        <div className="flex items-center gap-3">
          {typeof liveStats.totalOrder === 'number' && (
            <span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--surface-muted)] rounded-full px-2 py-0.5" title="Tổng số đơn hàng">
              {formatNumber(liveStats.totalOrder)} đơn
            </span>
          )}
          {typeof liveStats.totalItems === 'number' && (
            <span className="text-[10px] font-semibold text-[var(--primary)] bg-[color:var(--primary-soft)] rounded-full px-2 py-0.5" title="Tổng số sản phẩm">
              {formatNumber(liveStats.totalItems)} SP
            </span>
          )}
        </div>
      </div>

      <div className="p-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/20 shrink-0">
        <div className="flex justify-between items-center px-2 py-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Tổng thu</span>
          <span className="text-base font-bold tracking-tight text-[var(--primary)]">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {state.status === "loading" ? <LoadingState compact /> : null}
        {state.status === "error" ? <ErrorState message={state.error} compact /> : null}
        {state.status === "ready" && orders.length === 0 ? (
          <EmptyState message="Livestream này chưa có đơn hàng." compact />
        ) : null}

        <div className="space-y-2.5">
          {orders.map((order, i) => {
            const id = pickString(order, ["id", "_id", "orderCode"]);
            const isActive = selectedOrderId === id;
            return (
              <button
                key={`${id || i}`}
                onClick={() => setSelectedOrderId(id)}
                className={`w-full text-left rounded-xl border p-3.5 transition duration-200 ${isActive ? 'bg-[color:var(--primary-soft)] border-[color:var(--primary-soft)] ring-1 ring-[var(--primary)]' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] shadow-[var(--shadow-soft)]'
                  }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                      {pickString(asRecord(order.customerId), ["igName"]) || pickString(order, ["igName", "customerName"]) || "Khách hàng"}
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? 'text-[var(--primary-strong)]' : 'text-[var(--primary)]'}`}>
                    {formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className={`font-mono text-[10px] tracking-wider ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>
                    #{pickString(order, ["orderCode", "code"]) || id?.substring(0, 8)}
                  </span>
                  <span className={`font-medium ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted)]'}`}>
                    Chờ thanh toán
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slide-out Panel For Order Detail */}
      <div
        className={`absolute inset-x-0 bottom-0 top-1/3 z-10 flex flex-col bg-[var(--surface)] shadow-[0_-15px_60px_-15px_rgba(0,0,0,0.3)] rounded-t-2xl border border-[var(--border)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedOrder ? 'translate-y-0 h-auto' : 'translate-y-full h-auto pointer-events-none opacity-0'}`}
      >
        {selectedOrder && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--border)] p-4 shrink-0 bg-[var(--surface-muted)]/30 rounded-t-2xl">
              <div>
                <h4 className="text-sm font-bold text-[var(--foreground)]">Chi tiết đơn</h4>
                <p className="font-mono text-[10px] text-[var(--muted)] tracking-widest mt-0.5 uppercase">
                  #{pickString(selectedOrder, ["orderCode", "code"]) || "Order"}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrderId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] shadow hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Thông tin người mua</h5>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subdued)] p-3.5 space-y-2.5">
                  <button
                    onClick={() => {
                      const custId = pickString(asRecord(selectedOrder.customerId), ["id", "_id"]) || pickString(selectedOrder, ["customerId"]);
                      setCustomerPopupId(customerPopupId === custId ? null : custId);
                    }}
                    className="font-semibold text-[var(--primary)] text-sm hover:underline transition-colors text-left w-full flex items-center gap-1.5"
                  >
                    {pickString(asRecord(selectedOrder.customerId), ["igName"]) || pickString(selectedOrder, ["igName", "customerName"]) || "Người mua"}
                    <svg className={`h-3 w-3 text-[var(--muted)] transition-transform ${customerPopupId ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <p className="text-xs text-[var(--foreground-soft)] flex items-center gap-1.5 font-medium">
                    <svg className="h-3.5 w-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {pickString(selectedOrder, ["phone"]) || "Chưa gửi SĐT"}
                  </p>
                  <p className="text-xs text-[var(--foreground-soft)] flex items-start gap-1.5 font-medium">
                    <svg className="h-3.5 w-3.5 text-[var(--muted)] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="truncate">{compactAddress(selectedOrder) || "Chưa gửi địa chỉ"}</span>
                  </p>
                </div>

                {/* Customer Detail Popup */}
                {customerPopupId && Object.keys(customerDetail).length > 0 && (
                  <div className="rounded-xl border border-[var(--primary)]/30 bg-[color:var(--primary-soft)] p-3.5 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">Hồ sơ khách hàng</span>
                      <button onClick={() => setCustomerPopupId(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="space-y-2 text-xs">
                      {pickString(customerDetail, ["phone"]) && (
                        <p className="flex items-center gap-1.5 text-[var(--foreground)]">
                          <span className="text-[var(--muted)] font-medium w-16 shrink-0">SĐT:</span>
                          {pickString(customerDetail, ["phone"])}
                        </p>
                      )}
                      {pickString(customerDetail, ["dayOfBirth"]) && (
                        <p className="flex items-center gap-1.5 text-[var(--foreground)]">
                          <span className="text-[var(--muted)] font-medium w-16 shrink-0">Sinh nhật:</span>
                          {formatDateTime(pickString(customerDetail, ["dayOfBirth"]))}
                        </p>
                      )}
                      {pickString(customerDetail, ["note"]) && (
                        <p className="flex items-start gap-1.5 text-[var(--foreground)]">
                          <span className="text-[var(--muted)] font-medium w-16 shrink-0">Ghi chú:</span>
                          <span className="break-words">{pickString(customerDetail, ["note"])}</span>
                        </p>
                      )}
                    </div>
                    {customerTags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {customerTags.map((tag, i) => (
                          <span key={pickString(tag, ["id", "_id"]) || i} className="inline-flex rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)] shadow-sm border border-[var(--border)]">
                            {pickString(tag, ["label", "name"])}
                          </span>
                        ))}
                      </div>
                    )}
                    {customerHistories.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Lịch sử gần đây</span>
                        {customerHistories.slice(0, 3).map((h, i) => (
                          <p key={i} className="text-[10px] text-[var(--foreground-soft)] pl-2 border-l-2 border-[var(--primary)]/30">
                            {pickString(h, ["title", "action", "type", "note"]) || "Hoạt động"}
                          </p>
                        ))}
                      </div>
                    )}
                    <Link href="/customers" className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--primary)] hover:underline pt-1">
                      Xem đầy đủ →
                    </Link>
                  </div>
                )}
              </div>

              {/* Comments in this order */}
              {(() => {
                const orderComments = extractCollection(selectedOrder.comments);
                if (orderComments.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <h5 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Bình luận trong đơn ({orderComments.length})</h5>
                    <div className="space-y-2">
                      {orderComments.map((c, idx) => (
                        <div key={pickString(c, ["id", "_id"]) || idx} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-subdued)] px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--foreground)] truncate">{pickString(c, ["igUsername", "username"])}</p>
                            <p className="text-[10px] text-[var(--foreground-soft)] truncate">{pickString(c, ["text", "content"])}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveComment(pickString(c, ["id", "_id"]))}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-red-50 hover:text-red-500 transition-colors ml-2"
                            title="Gỡ comment khỏi đơn"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-3">
                <h5 className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Tổng kết đơn</h5>
                <div className="rounded-xl justify-between flex items-center border border-[var(--border)] bg-[var(--surface-subdued)] p-3.5">
                  <span className="text-sm font-semibold text-[var(--foreground)]">Thành tiền</span>
                  <span className="text-lg font-bold text-[var(--primary)]">{formatCurrency(pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-subdued)] shrink-0 flex gap-3">
              <button
                onClick={handleDeleteOrder}
                disabled={deleteLoading}
                className="flex-1 rounded-xl bg-red-50 px-4 py-2.5 text-xs font-bold text-red-600 shadow-[var(--shadow-soft)] hover:bg-red-100 transition-colors border border-red-200 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
              >
                {deleteLoading ? "Đang xoá..." : "Xoá đơn"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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

    // Initial load state for comments won't be synced deeply yet, 
    // real time comments will use SSE stream effect below.
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

  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [streamState, setStreamState] = useState<"connecting" | "live" | "stopped" | "error">("connecting");
  const abortRef = useRef<AbortController | null>(null);

  // Sync initial loaded comments to state so SSE can append to it
  useEffect(() => {
    if (data?.comments) {
      setComments(data.comments);
    }
  }, [data?.comments]);

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
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [printOrder, setPrintOrder] = useState<any>(null);
  const paperSize = useSettingsStore(state => state.paperSize) as "80mm" | "58mm" | "a5";

  const { data, status, error: queryError } = useOrders(search);

  const state = {
    status: status === "pending" ? "loading" : status === "success" ? "ready" : "error",
    data: data || null,
    error: queryError ? queryError.message : "",
  }

  const [exportState, setExportState] = useState("");
  const [range, setRange] = useState({
    startDate: "2026-03-01",
    endDate: "2026-03-31",
  });
  const doExport = useExportOrders();

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
    const result = await doExport(range);
    setExportState(result.ok ? result.filename : "Export failed");
  }

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <Hero title="BẢN TIN BÁN HÀNG" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Đơn cần xử lý"
          value={orders.length}
          icon={<BagIcon />}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <StatCard
          label="Tiền về (Doanh thu)"
          value={formatCurrency(totalRevenue)}
          icon={<BriefcaseIcon />}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          label="Tiền cọc"
          value={formatCurrency(totalDeposit)}
          icon={<HomeIcon />}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      <Panel title="Danh sách Đơn hàng" className="overflow-hidden relative">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-[var(--surface-subdued)] p-4 rounded-xl border border-[var(--border)]">
          <div className="flex flex-col sm:flex-row flex-1 w-full max-w-3xl relative items-center gap-3">
            <div className="flex bg-[var(--surface-strong)] rounded-xl p-1 border border-[var(--border)] shrink-0 w-full sm:w-auto overflow-x-auto no-scrollbar">
              <button className="flex-1 sm:flex-none whitespace-nowrap rounded-lg bg-[var(--primary)] text-white px-4 py-2 text-sm font-semibold shadow-sm">Hôm nay</button>
              <button className="flex-1 sm:flex-none whitespace-nowrap rounded-lg text-[var(--foreground)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] transition-colors">Hôm qua</button>
              <button className="flex-1 sm:flex-none whitespace-nowrap rounded-lg text-[var(--foreground)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] transition-colors">Live vừa rồi</button>
            </div>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm mã đơn/SĐT"
                className={`${CONTROL_CLASS} w-full pl-10 h-11 text-base rounded-xl`}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExport}
              className={`${PRIMARY_BUTTON_CLASS} h-11 px-5 rounded-xl bg-[#28c840] hover:bg-[#23af37] font-bold`}
            >
              Xuất file đi giao
            </button>
          </div>
        </div>

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

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden relative">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Mã đơn</th>
                  <th className="px-5 py-3 font-semibold">Tên khách</th>
                  <th className="px-5 py-3 font-semibold">SĐT</th>
                  <th className="px-5 py-3 font-semibold text-right">Số tiền</th>
                  <th className="px-5 py-3 font-semibold text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {orders.map((order, index) => {
                  const id = pickString(order, ["id", "_id", "orderCode"]);
                  const isActive = selectedOrderId === id;
                  return (
                    <tr
                      key={`${id || index}`}
                      onClick={() => setSelectedOrderId(id || "")}
                      className={`cursor-pointer transition hover:bg-[var(--surface-muted)]/60 ${isActive ? "bg-[var(--primary)]/5" : ""}`}
                    >
                      <td className="px-4 py-2 font-mono text-sm font-semibold text-[var(--primary)]">#{pickString(order, ["orderCode", "code"]) || id?.substring(0, 8)}</td>
                      <td className="px-4 py-2 font-semibold text-[var(--foreground)] text-base">{pickString(order, ["igName", "customerName"]) || "Khách hàng"}</td>
                      <td className="px-4 py-2 text-[var(--foreground)] font-medium">{pickString(order, ["phone"]) || "—"}</td>
                      <td className="px-4 py-2 font-bold text-right text-[var(--foreground)] text-base">{formatCurrency(pickNumber(order, ["totalPrice", "amount"]) ?? 0)}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex rounded-full bg-[color:var(--primary-soft)] px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">Chờ xử lý</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className={`absolute inset-y-0 right-0 z-20 flex w-full sm:max-w-md flex-col bg-[var(--surface)] shadow-[rgba(0,0,0,0.1)_0px_0px_40px] border-l border-[var(--border)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${selectedOrder && selectedOrderId ? 'translate-x-0' : 'translate-x-full'}`}
          >
            {selectedOrder && (
              <>
                <div className="flex items-center justify-between border-b border-[var(--border)] p-4 shrink-0 bg-[var(--surface-subdued)]">
                  <div>
                    <h4 className="text-xl font-bold text-[var(--foreground)]">Chi tiết đơn hàng</h4>
                    <p className="font-mono text-sm text-[var(--primary)] font-semibold tracking-widest mt-1 uppercase">
                      #{pickString(selectedOrder, ["orderCode", "code"]) || "Order"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedOrderId("")}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-strong)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] transition-colors"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <div className="rounded-2xl bg-[var(--surface-muted)] p-6 text-center shadow-inner">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)] mb-2">Khách phải trả</p>
                    <p className="text-5xl font-bold tracking-tight text-[#16a34a]">
                      {formatCurrency(pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0)}
                    </p>
                  </div>

                  <dl className="space-y-5 text-base">
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-5">
                      <dt className="font-medium text-[var(--muted)]">Tên khách</dt>
                      <dd className="font-bold text-[var(--foreground)] text-lg">{pickString(selectedOrder, ["igName", "customerName"]) || "Khách hàng"}</dd>
                    </div>
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-5">
                      <dt className="font-medium text-[var(--muted)]">Số điện thoại</dt>
                      <dd className="font-bold text-[var(--foreground)] text-lg">{pickString(selectedOrder, ["phone"]) || "Chưa gửi"}</dd>
                    </div>
                    <div className="flex justify-between items-center border-b border-[var(--border)] pb-5">
                      <dt className="font-medium text-[var(--muted)]">Tiền cọc</dt>
                      <dd className="font-bold text-[#16a34a] text-lg">{formatCurrency(pickNumber(selectedOrder, ["deposit"]) ?? 0)}</dd>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <dt className="font-medium text-[var(--muted)]">Thời gian tạo</dt>
                      <dd className="text-[var(--foreground)] font-medium">{formatDateTime(pickString(selectedOrder, ["createdAt", "updatedAt"]))}</dd>
                    </div>
                  </dl>
                </div>

                <div className="p-6 border-t border-[var(--border)] bg-[var(--surface-subdued)] shrink-0 flex flex-col gap-4">
                  <button className="w-full rounded-xl bg-[#1447E6] hover:bg-[#0E3BBF] px-4 py-4 text-base font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    XÁC NHẬN ĐƠN HÀNG
                  </button>
                  <button
                    onClick={() => {
                      const orderData = {
                        orderCode: pickString(selectedOrder, ["orderCode", "code"]) || "Order",
                        customerName: pickString(selectedOrder, ["igName", "customerName"]) || "Khách hàng",
                        phone: pickString(selectedOrder, ["phone"]),
                        address: compactAddress(selectedOrder),
                        totalPrice: pickNumber(selectedOrder, ["totalPrice", "amount"]) ?? 0,
                        deposit: pickNumber(selectedOrder, ["deposit"]) ?? 0,
                        createdAt: pickString(selectedOrder, ["createdAt", "updatedAt"]),
                        shopName: "LiveTracker Shop",
                      };
                      setPrintOrder(orderData);
                    }}
                    className="w-full rounded-xl bg-[#28c840] hover:bg-[#23af37] px-4 py-4 text-base font-bold text-white shadow-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    IN VẬN ĐƠN
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </Panel>

      {printOrder && (
        <PrintTemplate
          order={printOrder}
          paperSize={paperSize || "80mm"}
          onClose={() => setPrintOrder(null)}
        />
      )}
    </div>
  );
}

export function CustomersScreen() {
  const [query, setQuery] = useState("");
  const search = useDeferredValue(query);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  const { data: listData, status: listStatus, error: listQueryError } = useCustomers(search);

  const state = {
    status: listStatus === "pending" ? "loading" : listStatus === "success" ? "ready" : "error",
    data: listData || null,
    error: listQueryError ? listQueryError.message : "",
  }

  const customers = extractCollection(state.data);
  const effectiveSelectedCustomerId =
    selectedCustomerId || pickString(customers[0], ["id", "_id"]);

  const { data: detailData, status: detailStatus, error: detailQueryError } = useCustomerDetail(effectiveSelectedCustomerId);

  const detailState = {
    status: detailStatus === "pending" ? "loading" : detailStatus === "success" ? "ready" : "error",
    data: detailData || null,
    error: detailQueryError ? detailQueryError.message : "",
  }

  const detail = asRecord(extractApiData(detailState.data));
  const tags = extractCollection(detail.tags);
  const histories = extractCollection(detail.histories);

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <Hero title="Hồ sơ Khách hàng" />

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

        <div className="grid grid-cols-1 xl:grid-cols-[6fr_4fr] gap-6">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-sm order-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-[var(--foreground)]">
                <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--muted)] border-b border-[var(--border)]">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">Khách hàng</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Số điện thoại</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Lần cuối</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {customers.map((customer, index) => {
                    const isActive = effectiveSelectedCustomerId === pickString(customer, ["id", "_id"]);
                    const name = pickString(customer, ["igName", "name"]) || "Customer";
                    return (
                      <tr
                        key={`${pickString(customer, ["id", "_id"]) || index}`}
                        onClick={() => setSelectedCustomerId(pickString(customer, ["id", "_id"]))}
                        className={`cursor-pointer transition-colors hover:bg-[var(--surface-muted)]/60 ${isActive ? 'bg-[var(--surface-muted)]/80' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ${isActive ? 'bg-[var(--primary)]' : 'bg-gray-400 dark:bg-gray-600'}`}>
                              {name[0]?.toUpperCase() || "C"}
                            </div>
                            <span className={`font-semibold ${isActive ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                              {name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground-soft)] font-medium">
                          {pickString(customer, ["phone"]) || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--muted)]">
                          {compactDate(pickString(customer, ["updatedAt", "createdAt"]))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <PanelInset title="Customer Profile">
            {detailState.status === "idle" || detailState.status === "loading" ? (
              <LoadingState compact />
            ) : detailState.status === "error" ? (
              <ErrorState message={detailState.error} compact />
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-3 border-b border-[var(--border)] pb-6 pt-2">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-2xl font-semibold text-white shadow-sm ring-4 ring-[var(--surface-muted)]">
                    {(pickString(detail, ["igName", "name"]) || "C")[0]?.toUpperCase()}
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {pickString(detail, ["igName", "name"]) || "Customer"}
                    </p>
                    <p className="text-sm text-[var(--muted)]">Instagram user</p>
                  </div>
                </div>

                <dl className="space-y-4 divide-y divide-[var(--border)] text-sm">
                  <div className="flex justify-between pb-4">
                    <dt className="font-medium text-[var(--muted)]">Phone</dt>
                    <dd className="font-medium text-[var(--foreground)]">{pickString(detail, ["phone"]) || "No phone"}</dd>
                  </div>
                  <div className="flex justify-between py-4">
                    <dt className="font-medium text-[var(--muted)]">Birthday</dt>
                    <dd className="text-[var(--foreground)]">{formatDateTime(pickString(detail, ["dayOfBirth"]))}</dd>
                  </div>
                  <div className="flex justify-between py-4">
                    <dt className="font-medium text-[var(--muted)]">Address</dt>
                    <dd className="w-2/3 text-right text-[var(--foreground)]">{compactAddress(detail) || "No address"}</dd>
                  </div>
                  <div className="flex justify-between pt-4">
                    <dt className="font-medium text-[var(--muted)]">Notes</dt>
                    <dd className="w-2/3 text-right text-[var(--foreground)]">{pickString(detail, ["note"]) || "No notes"}</dd>
                  </div>
                </dl>

                <div className="pt-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.length === 0 ? (
                      <span className="text-sm text-[var(--muted)]">No tags</span>
                    ) : (
                      tags.map((tag, index) => (
                        <span key={`${pickString(tag, ["id", "_id"]) || index}`} className="inline-flex rounded-md bg-[color:var(--primary-soft)] px-2 py-1 text-xs font-medium text-[var(--primary)]">
                          {pickString(tag, ["label", "name"]) || "Tag"}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Recent History</h4>
                  <div className="space-y-4 border-l-2 border-[var(--border)] pl-3">
                    {histories.length === 0 ? (
                      <span className="text-sm text-[var(--muted)]">Chưa có lịch sử.</span>
                    ) : (
                      histories.slice(0, 4).map((history, index) => (
                        <div key={`${pickString(history, ["id", "_id"]) || index}`} className="relative text-sm">
                          <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-[var(--primary)] ring-4 ring-[var(--surface)]" />
                          <p className="text-[var(--foreground-soft)]">
                            {pickString(history, ["title", "action", "type", "note"]) || "Customer activity"}
                          </p>
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
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="mb-6 flex flex-col gap-1">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] md:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-[var(--muted)]">
          {description}
        </p>
      )}
    </section>
  );
}

function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm ${className}`}>
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-base font-semibold text-[var(--foreground)]">
            {title}
          </h2>
          {action}
        </div>
      </div>
      <div className="p-5">{children}</div>
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
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  trend,
}: {
  label: string;
  value: Primitive;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  trend?: string;
}) {
  return (
    <article className="flex items-center gap-4 sm:gap-6 rounded-2xl bg-[var(--surface)] p-5 sm:p-8 shadow-[var(--shadow-soft)] transition-all hover:shadow-md">
      <div className={`flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full ${iconBg} ${iconColor}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: "h-6 w-6 sm:h-8 sm:w-8" }) : icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">
          {typeof value === "number" ? formatNumber(value) : String(value)}+
        </h3>
        <p className="mt-0.5 text-xs sm:text-sm font-medium text-[var(--muted)] truncate">{label}</p>
      </div>
    </article>
  );
}

function HeartIcon() {
  return <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.727 4 2.015Q12.454 3 14.5 3c2.786 0 5.25 2.322 5.25 5.25 0 3.924-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>
}

function HomeIcon() {
  return <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" /><path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" /></svg>
}

function BagIcon() {
  return <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>
}

function BriefcaseIcon() {
  return <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M7.5 5.25a3 3 0 013-3h3a3 3 0 013 3v.25h1.75c1.105 0 2 .895 2 2v2.25h-15V7.5c0-1.105.895-2 2-2H7.5v-.25zm-4.5 6v6.75a3 3 0 003 3h12a3 3 0 003-3v-6.75h-18zM10.5 9v1.5a.75.75 0 001.5 0V9h-1.5z" clipRule="evenodd" /></svg>
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
    blue: "bg-[var(--primary-soft)] text-[var(--primary)]",
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


