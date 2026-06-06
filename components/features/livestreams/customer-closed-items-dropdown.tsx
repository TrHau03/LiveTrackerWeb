"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "@/components/session-provider";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import {
  asRecord,
  pickString,
  pickNumber,
  extractCollection,
} from "@/lib/proxy-client";
import { formatNumber } from "@/components/ui/workspace-shared";

interface CustomerClosedItemsDropdownProps {
  customerId?: string;
  igUserId: string;
  igUsername: string;
  customerClosedCount: number;
  allComments: Record<string, unknown>[];
  onCancelOrder: (comment: Record<string, unknown>) => Promise<void>;
  onFilterCustomer?: (query: string) => void;
  loadingComments: Set<string>;
  liveId: string;
}

export function CustomerClosedItemsDropdown({
  customerId,
  igUserId,
  igUsername,
  customerClosedCount,
  allComments,
  onCancelOrder,
  onFilterCustomer,
  loadingComments,
  liveId,
}: CustomerClosedItemsDropdownProps) {
  const { session, patchSession, logout } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [popoverDirection, setPopoverDirection] = useState<"down" | "up">("down");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch items from API when opened
  useEffect(() => {
    if (!isOpen) return;

    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If below space is less than 360px (max height popover + margin)
      setPopoverDirection(spaceBelow < 360 ? "up" : "down");
    }

    async function fetchItems() {
      if (!session.accessToken) return;
      setIsFetching(true);
      try {
        const { fetchMyOrders } = await import("@/lib/services/orders-service");

        const res = await fetchMyOrders(session, {
          liveId,
          search: igUsername || igUserId,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        applyAuthResponses([res.response], patchSession, logout);
        if (res.ok && res.data) {
          const orders = extractCollection(res.data);

          // Extract all comments from orders belonging to this liveId
          const allCommentsFromOrders: Record<string, unknown>[] = [];

          if (Array.isArray(orders)) {
            orders.forEach((order) => {
              const oRecord = asRecord(order);
              const oLiveId = pickString(asRecord(oRecord.liveId) || oRecord, ["_id", "liveId"]);

              // Check if order belongs to current livestream
              if (oLiveId === liveId || !liveId) {
                const commentList = oRecord.commentIds;
                if (Array.isArray(commentList)) {
                  allCommentsFromOrders.push(
                    ...commentList.filter(
                      (c) => typeof c === "object" && c !== null
                    ) as Record<string, unknown>[]
                  );
                }
              }
            });
          }

          // Sort all comments by latest first
          allCommentsFromOrders.sort((a, b) => {
            const dateA = new Date(pickString(a, ["createdAt", "created_at"]) || 0).getTime();
            const dateB = new Date(pickString(b, ["createdAt", "created_at"]) || 0).getTime();
            return dateB - dateA;
          });

          setItems(allCommentsFromOrders);
        } else {
          // Fallback to offline filter if API fails or returns no data
          const filtered = allComments.filter((c) => {
            const uid = pickString(c, ["igUserId", "ig_user_id"]);
            const status = pickString(c, ["status"]);
            return uid === igUserId && (status === "NORMAL" || status === "SUCCESS");
          });
          setItems(filtered);
        }
      } catch (err) {
        console.error("Fetch orders error", err);
        setItems([]);
      } finally {
        setIsFetching(false);
      }
    }

    fetchItems();
  }, [isOpen, liveId, igUserId, igUsername, session, patchSession, logout, allComments]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (!isOpen && onFilterCustomer) {
      onFilterCustomer(igUsername);
    }
  };

  const hasItems = Array.isArray(items) && items.length > 0;
  if (customerClosedCount <= 0 && !hasItems && !isFetching) return null;

  return (
    <div className="relative mt-1 flex justify-center w-full" ref={dropdownRef}>
      <button
        onClick={handleClick}
        className="flex items-center justify-center text-[var(--muted)] hover:text-green-600 transition-colors p-1 cursor-pointer shrink-0"
        title="Số lượng món đã mua (Click để xem và lọc đơn)"
      >
        <div className="relative">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.3 5h12.6M9 19h.01M16 19h.01"
            />
          </svg>
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-600 text-[8px] font-bold text-white ring-1 ring-white animate-in zoom-in-50 duration-200">
            {customerClosedCount}
          </span>
        </div>
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl z-[100] animate-in fade-in transition-all duration-200 ${
            popoverDirection === "up"
              ? "bottom-full mb-2 slide-in-from-bottom-2"
              : "top-full mt-1.5 slide-in-from-top-2"
          }`}
        >
          <div className="mb-2 px-1 pb-2 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--foreground)]">Các món đã chốt hiện tại</span>
              <span className="text-[10px] bg-[var(--surface-muted)] px-1.5 py-0.5 rounded-full text-[var(--muted)]">
                {isFetching ? "Đang tải..." : `${items.length} món`}
              </span>
            </div>
          </div>
          <div className="max-h-[340px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1 min-h-[50px]">
            {isFetching ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <svg
                  className="h-5 w-5 animate-spin text-[var(--primary)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span className="text-[10px] text-[var(--muted)] font-medium">Đang lấy dữ liệu...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-xs text-[var(--muted)] px-2 py-4 italic text-center">
                Không tìm thấy đơn hàng nào.
              </div>
            ) : (
              items.map((item, index) => {
                const cid = pickString(item, ["id", "_id", "commentId"]) || `item-${index}`;
                const text = pickString(item, ["text", "content"]);
                const quantity = pickNumber(item, ["quantity"]) ?? 1;
                const price = pickNumber(item, ["price"]) ?? 0;
                const status = pickString(item, ["status"]);
                const isLoading = loadingComments.has(cid);

                return (
                  <div
                    key={cid}
                    className="flex flex-col gap-1 rounded-lg px-2.5 py-1.5 border border-dashed border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-muted)] transition-all text-left bg-[var(--surface-subtle)]/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <span className="text-[11px] font-medium text-[var(--foreground)] line-clamp-2 leading-tight block">
                          {text}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {status === "BACKUP" && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-wider">
                              Dự bị
                            </span>
                          )}
                          {status === "CONFIRMED_ERROR" && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-500 border border-red-200 uppercase tracking-wider">
                              Đã báo lỗi
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancelOrder(item);
                        }}
                        disabled={isLoading}
                        title="Huỷ chốt"
                        className="shrink-0 p-1 -m-1 rounded-full text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex justify-between items-center mt-0.5">
                      <span className="text-[10px] text-[var(--muted)] font-bold bg-[var(--surface-muted)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                        SL: {quantity}
                      </span>
                      {price > 0 && (
                        <span className="text-[11px] text-[var(--primary)] font-black">
                          {formatNumber(price)}đ
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
