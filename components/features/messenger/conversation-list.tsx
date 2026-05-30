"use client";

import React, { useCallback, useState } from "react";
import { useSession } from "@/components/session-provider";
import { useConversations, useMessengerSSE, useSyncConversations } from "@/hooks/use-messenger";
import type { Conversation } from "@/types";
import { ConversationItem } from "./conversation-item";

// ─── Debounce hook ───────────────────────────────────────────────────────────

function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ConversationListProps {
  activeConversationId: string | null;
  onSelectConversation: (conversation: Conversation) => void;
}

export function ConversationList({
  activeConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const { session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // SSE connection
  const { isConnected } = useMessengerSSE();

  // Conversations query
  const {
    data: conversationsData,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching,
  } = useConversations(debouncedSearch || undefined);

  // Sync mutation
  const syncMutation = useSyncConversations();

  const conversations =
    conversationsData?.pages.flatMap((page) => page.items) || [];

  const handleSync = useCallback(() => {
    const shops = session.user?.shops;
    if (!shops || shops.length === 0) return;

    shops.forEach((shop) => {
      syncMutation.mutate(shop.id);
    });
  }, [session.user, syncMutation]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const nearBottom =
        target.scrollHeight - target.scrollTop - target.clientHeight < 100;
      if (nearBottom && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  return (
    <div className="conv-list">
      {/* Header */}
      <div className="conv-list-header">
        <div className="conv-list-header-top">
          <div className="conv-list-title-row">
            <h2 className="conv-list-title">Tin nhắn</h2>
            {isConnected && <span className="conv-list-connected-dot" />}
          </div>
          <div className="conv-list-actions">
            <button
              type="button"
              className="conv-list-icon-btn"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              title="Đồng bộ hội thoại"
            >
              {syncMutation.isPending ? (
                <span className="conv-list-spinner" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="conv-list-icon-btn"
              onClick={() => refetch()}
              disabled={isRefetching}
              title="Làm mới"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 4v6h6M23 20v-6h-6" />
                <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="conv-list-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Tìm kiếm hội thoại..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="conv-list-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="conv-list-clear-btn"
              onClick={() => setSearchQuery("")}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="conv-list-body" onScroll={handleScroll}>
        {isLoading ? (
          <div className="conv-list-center">
            <span className="conv-list-spinner conv-list-spinner--lg" />
            <p className="conv-list-center-text">Đang tải...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="conv-list-center">
            <div className="conv-list-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
              </svg>
            </div>
            <p className="conv-list-empty-title">Chưa có hội thoại</p>
            <p className="conv-list-empty-desc">
              Nhấn nút đồng bộ để tải hội thoại từ Instagram
            </p>
            <button
              type="button"
              className="conv-list-sync-btn"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? "Đang đồng bộ..." : "Đồng bộ ngay"}
            </button>
          </div>
        ) : (
          <>
            {conversations.map((conv) => (
              <ConversationItem
                key={conv._id}
                item={conv}
                isActive={activeConversationId === conv._id}
                onPress={() => onSelectConversation(conv)}
              />
            ))}
            {isFetchingNextPage && (
              <div className="conv-list-loading-more">
                <span className="conv-list-spinner" />
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .conv-list {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-right: 1px solid var(--border);
          background: var(--surface);
        }

        .conv-list-header {
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .conv-list-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .conv-list-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .conv-list-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--foreground);
          margin: 0;
        }
        .conv-list-connected-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22C55E;
          flex-shrink: 0;
        }
        .conv-list-actions {
          display: flex;
          gap: 4px;
        }
        .conv-list-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--foreground-soft);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 150ms ease;
        }
        .conv-list-icon-btn:hover {
          background: var(--hover);
          color: var(--foreground);
        }
        .conv-list-icon-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .conv-list-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--background);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 0 12px;
          height: 36px;
        }
        .conv-list-search-input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: var(--foreground);
        }
        .conv-list-search-input::placeholder {
          color: var(--muted);
        }
        .conv-list-clear-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted);
          padding: 2px;
          display: flex;
        }

        .conv-list-body {
          flex: 1;
          overflow-y: auto;
        }

        .conv-list-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          height: 100%;
          gap: 8px;
        }
        .conv-list-center-text {
          font-size: 13px;
          color: var(--muted);
          margin: 0;
        }

        .conv-list-empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--background);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }
        .conv-list-empty-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--foreground);
          margin: 0;
        }
        .conv-list-empty-desc {
          font-size: 13px;
          color: var(--muted);
          text-align: center;
          margin: 0 0 12px;
        }
        .conv-list-sync-btn {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          background: var(--primary);
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 150ms ease;
        }
        .conv-list-sync-btn:hover {
          opacity: 0.9;
        }
        .conv-list-sync-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .conv-list-loading-more {
          display: flex;
          justify-content: center;
          padding: 12px;
        }

        .conv-list-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 600ms linear infinite;
        }
        .conv-list-spinner--lg {
          width: 28px;
          height: 28px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
