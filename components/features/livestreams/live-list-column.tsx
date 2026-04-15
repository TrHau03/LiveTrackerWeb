"use client";

import React, { useState, useDeferredValue, useEffect, useMemo, useRef } from "react";
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
  const [detecting, setDetecting] = useState(false);
  const queryClient = useQueryClient();

  const [selectedShopId, setSelectedShopId] = useState<string>("all");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<"week" | "month" | null>(null);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const shopDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shopDropdownRef.current && !shopDropdownRef.current.contains(event.target as Node)) {
        setIsShopDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const deferredShopId = useDeferredValue(selectedShopId);
  const deferredStartDate = useDeferredValue(startDate);
  const deferredEndDate = useDeferredValue(endDate);

  const { data, status, error: queryError } = useLives({
    shopId: deferredShopId,
    startDate: deferredStartDate ? new Date(deferredStartDate).toISOString() : undefined,
    endDate: deferredEndDate ? new Date(deferredEndDate).toISOString() : undefined
  });

  const handleThisWeek = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const formatDate = (d: Date) => {
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
    setActiveQuickFilter("week");
  };

  const handleThisMonth = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 30);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const formatDate = (d: Date) => {
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
    setActiveQuickFilter("month");
  };

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setSelectedShopId("all");
    setActiveQuickFilter(null);
  };

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

  const availableShops = useMemo(() => {
    const shopMap = new Map<string, { id: string, name: string, avatar?: string }>();

    if (session.user?.shops) {
      session.user.shops.forEach(s => {
        if (s.id) shopMap.set(s.id, { id: s.id, name: s.name, avatar: s.avatar });
      });
    }

    if (state.data) {
      extractCollection(state.data).forEach((live: any) => {
        const shopId = pickString(live, ["shopId"]) || pickString(asRecord(live.shop), ["id", "_id"]);
        if (!shopId || shopMap.has(shopId)) return;
        
        let shopName = "Shop";
        let shopAvatar = "";
        const userRec = asRecord(live.user || live.userId);
        const shopRec = asRecord(live.shop);
        
        if (pickString(shopRec, ["name"])) {
           shopName = pickString(shopRec, ["name"]);
           shopAvatar = pickString(shopRec, ["avatar"]);
        } else if (userRec) {
           if (Array.isArray(userRec.shops)) {
             const s = userRec.shops.find((x: any) => x.id === shopId || x._id === shopId);
             if (s && s.name) {
               shopName = s.name;
               shopAvatar = pickString(s as any, ["avatar"]);
             }
           } else if (asRecord(userRec.shop) && pickString(asRecord(userRec.shop), ["name"])) {
             shopName = pickString(asRecord(userRec.shop), ["name"]);
             shopAvatar = pickString(asRecord(userRec.shop), ["avatar"]);
           } else if (pickString(userRec, ["shopName", "fullName", "username"])) {
             shopName = pickString(userRec, ["shopName", "fullName", "username"]);
             shopAvatar = pickString(userRec, ["avatar"]);
           }
        }
        
        shopMap.set(shopId, { id: shopId, name: shopName, avatar: shopAvatar });
      });
    }

    return Array.from(shopMap.values());
  }, [session.user, state.data]);

  const groupedLives = useMemo(() => {
    const groups = new Map<string, { shopId: string; shopName: string; shopAvatar?: string; lives: typeof livestreams }>();

    livestreams.forEach((live) => {
      const shopId = live.shopId || "unknown";
      if (!groups.has(shopId)) {
        const shop = availableShops.find(s => s.id === shopId);
        groups.set(shopId, { 
          shopId, 
          shopName: shop?.name || "Shop", 
          shopAvatar: shop?.avatar,
          lives: [] 
        });
      }
      groups.get(shopId)!.lives.push(live);
    });

    return Array.from(groups.values());
  }, [livestreams, availableShops]);

  useEffect(() => {
    if (livestreams.length > 0 && !activeLiveId) {
      onSelectLive(livestreams[0].id || "");
    }
  }, [livestreams, activeLiveId, onSelectLive]);

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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1" ref={shopDropdownRef}>
              <button
                onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                className={`${CONTROL_CLASS} w-full flex items-center gap-2.5 text-left transition-all ${isShopDropdownOpen ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "hover:border-gray-300"}`}
              >
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {selectedShopId === "all" ? (
                    <ShopAvatar name="All" isAll size="sm" />
                  ) : (
                    <ShopAvatar name={availableShops.find(s => s.id === selectedShopId)?.name || "Shop"} url={availableShops.find(s => s.id === selectedShopId)?.avatar} size="sm" />
                  )}
                  <span className="truncate">
                    {selectedShopId === "all" ? "Tất cả các shop" : availableShops.find(s => s.id === selectedShopId)?.name || "Tất cả các shop"}
                  </span>
                </div>
                <svg className={`h-4 w-4 shrink-0 text-[var(--muted)] transition-transform duration-200 ${isShopDropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {isShopDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg">
                  <button
                    onClick={() => {
                      setSelectedShopId("all");
                      setIsShopDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${selectedShopId === "all" ? "bg-[color:var(--primary-soft)] text-[var(--primary)] font-semibold" : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]"}`}
                  >
                    <ShopAvatar name="All" isAll />
                    <span className="truncate flex-1 text-left">Tất cả các shop</span>
                    {selectedShopId === "all" && <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  {availableShops.map((shop: { id: string; name: string; avatar?: string }) => (
                    <button
                      key={shop.id}
                      onClick={() => {
                        setSelectedShopId(shop.id);
                        setIsShopDropdownOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors mt-0.5 ${selectedShopId === shop.id ? "bg-[color:var(--primary-soft)] text-[var(--primary)] font-semibold" : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]"}`}
                    >
                      <ShopAvatar name={shop.name} url={shop.avatar} />
                      <span className="truncate flex-1 text-left">{shop.name}</span>
                      {selectedShopId === shop.id && <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] transition-all ${showDateFilter ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"}`}
              title="Lọc theo ngày"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
          </div>

          {showDateFilter && (
            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/30 p-2">
              <div className="flex gap-2">
                <button
                  onClick={handleThisWeek}
                  className={`flex-1 rounded py-1 text-[11px] font-medium transition-all border ${activeQuickFilter === "week" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--surface-muted)]"}`}
                >
                  Tuần này
                </button>
                <button
                  onClick={handleThisMonth}
                  className={`flex-1 rounded py-1 text-[11px] font-medium transition-all border ${activeQuickFilter === "month" ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)] hover:bg-[var(--surface-muted)]"}`}
                >
                  Tháng này
                </button>
                {(startDate || endDate || selectedShopId !== "all") && (
                  <button
                    onClick={clearAllFilters}
                    className="flex-1 rounded py-1 text-[11px] font-medium border border-[rgba(255,69,58,0.2)] text-[rgb(255,69,58)] bg-transparent hover:bg-[rgba(255,69,58,0.05)] transition-all"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] uppercase font-semibold text-[var(--muted)] tracking-wider">Từ ngày</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setActiveQuickFilter(null); }}
                    className={`${CONTROL_CLASS} w-full px-2 py-1 text-[11px] h-8 font-medium`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase font-semibold text-[var(--muted)] tracking-wider">Đến ngày</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setActiveQuickFilter(null); }}
                    className={`${CONTROL_CLASS} w-full px-2 py-1 text-[11px] h-8 font-medium`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {state.status === "loading" ? <LoadingState compact /> : null}
        {state.status === "error" ? <ErrorState message={state.error} compact /> : null}
        {state.status === "ready" && livestreams.length === 0 ? (
          <EmptyState message="Không tìm thấy livestream nào." compact />
        ) : null}

        <div className="space-y-4">
          {groupedLives.map((group) => (
            <div key={group.shopId} className="flex flex-col border border-[var(--border)] rounded-xl bg-[var(--surface)] overflow-hidden shadow-sm">
              <div className="bg-[var(--surface-muted)]/50 px-3 py-2 border-b border-[var(--border)] flex items-center gap-2">
                <ShopAvatar name={group.shopName} url={group.shopAvatar} size="xs" />
                <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">{group.shopName}</span>
                <span className="ml-auto text-[10px] font-semibold bg-[var(--surface)] border border-[var(--border)] px-1.5 py-0.5 rounded-full text-[var(--muted)]">
                  {group.lives.length} Live
                </span>
              </div>
              <div className="flex flex-col p-1.5 gap-1.5">
                {group.lives.map((live) => {
                  const isActive = activeLiveId === live.id;
                  const displayComments = isActive && liveStats.totalComment > 0 ? liveStats.totalComment : live.comments;
                  const displayOrders = isActive && liveStats.totalOrder > 0 ? liveStats.totalOrder : live.orders;
                  return (
                    <button
                      key={live.id}
                      onClick={() => { if (live.id) onSelectLive(live.id) }}
                      className={`w-full text-left rounded-lg p-2.5 transition border ${isActive
                        ? "bg-[color:var(--primary-soft)] border-[var(--primary)]/30 text-[var(--primary)] shadow-sm"
                        : "border-[var(--border)]/50 bg-transparent hover:bg-[var(--surface-muted)] text-[var(--foreground)] hover:border-[var(--border)]"
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
          ))}
        </div>
      </div>
    </div>
  );
}

function ShopAvatar({ 
  name, 
  url, 
  size = "md", 
  isAll = false 
}: { 
  name: string; 
  url?: string; 
  size?: "xs" | "sm" | "md"; 
  isAll?: boolean;
}) {
  const sizeClasses = {
    xs: "h-5 w-5 text-[10px]",
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
  };

  const iconClasses = {
    xs: "h-3 w-3",
    sm: "h-3.5 w-3.5",
    md: "h-4.5 w-4.5",
  };

  if (isAll) {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center rounded bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--border)] shrink-0`}>
        <svg className={iconClasses[size]} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
    );
  }

  if (url) {
    return (
      <div className={`${sizeClasses[size]} relative flex shrink-0 overflow-hidden rounded ring-1 ring-[var(--border)] bg-[var(--surface-muted)]`}>
        <img src={url} alt={name} className="h-full w-full object-cover" onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
          (e.target as HTMLImageElement).parentElement?.classList.add('fallback-active');
        }} />
        <div className="absolute inset-0 items-center justify-center bg-[var(--primary-soft)] text-[var(--primary)] font-bold hidden [.fallback-active_&]:flex">
          {name.charAt(0).toUpperCase()}
        </div>
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} flex items-center justify-center rounded bg-[var(--primary-soft)] text-[var(--primary)] font-bold shrink-0 border border-[var(--primary)]/10`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
