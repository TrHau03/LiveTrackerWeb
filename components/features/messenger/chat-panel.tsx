"use client";

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useSession } from "@/components/session-provider";
import {
  getWindowStatus,
  useMarkAsRead,
  useMessages,
  useSendMessage,
  useSyncMessages,
} from "@/hooks/use-messenger";
import type { Conversation, Message } from "@/types";
import { ChatInput } from "./chat-input";
import { MessageBubble, isSameDay, formatDateSeparator } from "./message-bubble";

// ─── Component ───────────────────────────────────────────────────────────────

interface ChatPanelProps {
  conversation: Conversation | null;
}

export function ChatPanel({ conversation }: ChatPanelProps) {
  const { session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const conversationId = conversation?._id ?? null;

  // Data hooks
  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);

  const sendMutation = useSendMessage(conversationId ?? "");
  const markReadMutation = useMarkAsRead();
  const syncMessagesMutation = useSyncMessages(conversationId ?? "");

  // Mark as read + sync on conversation change
  useEffect(() => {
    if (conversationId) {
      markReadMutation.mutate(conversationId);
      if (conversation?.shopId) {
        syncMessagesMutation.mutate(conversation.shopId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Flatten messages
  const allMessages = useMemo(() => {
    if (!messagesData?.pages) return [];
    const msgs = messagesData.pages.flatMap((page) => page.items);
    const seen = new Set<string>();
    return msgs.filter((msg) => {
      if (seen.has(msg._id)) return false;
      seen.add(msg._id);
      return true;
    });
  }, [messagesData]);

  // Window status
  const windowStatus = useMemo(
    () =>
      getWindowStatus(conversation?.lastCustomerMessageAt, allMessages),
    [conversation?.lastCustomerMessageAt, allMessages],
  );

  // Auto-scroll to bottom on conversation change or new messages
  const prevConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const isSwitchingConv = prevConversationIdRef.current !== conversationId;
    
    if (!isLoading && allMessages.length > 0) {
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        if (isSwitchingConv) {
          // Scroll instantly on switching conversation to prevent visual jumpiness
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
          
          // Re-scroll after a short delay to guarantee bottom position after browser paint
          const timer = setTimeout(() => {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }, 50);
          
          prevConversationIdRef.current = conversationId;
          return () => clearTimeout(timer);
        } else {
          // Smooth scroll for new messages inside the active conversation
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }
      }
    }
    
    if (isLoading) {
      // Reset ref during load to trigger instant scroll once content is ready
      prevConversationIdRef.current = null;
    }
  }, [conversationId, isLoading, allMessages.length]);

  // Listen for image load events to adjust scroll position
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleImageLoaded = () => {
      // Scroll to bottom when any image finishes loading to prevent layout shifts pushing messages away
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    };

    scrollContainer.addEventListener("message-image-loaded", handleImageLoaded);
    return () => {
      scrollContainer.removeEventListener("message-image-loaded", handleImageLoaded);
    };
  }, []);

  // Send handler
  const handleSend = useCallback(
    (text: string) => {
      sendMutation.mutate(
        { text, useHumanAgentTag: windowStatus === "human_agent" },
      );
    },
    [sendMutation, windowStatus],
  );

  // Load older messages
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      if (target.scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (!conversation) {
    return (
      <div className="chat-panel chat-panel--empty">
        <div className="chat-panel-empty-content">
          <div className="chat-panel-empty-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
            </svg>
          </div>
          <h3 className="chat-panel-empty-title">Chọn một hội thoại</h3>
          <p className="chat-panel-empty-desc">
            Chọn hội thoại từ danh sách bên trái để bắt đầu nhắn tin
          </p>
        </div>

        <style jsx>{`
          .chat-panel--empty {
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--background);
            flex: 1;
          }
          .chat-panel-empty-content {
            text-align: center;
            padding: 40px;
          }
          .chat-panel-empty-icon {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: var(--surface);
            border: 1px solid var(--border);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
          }
          .chat-panel-empty-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--foreground);
            margin: 0 0 8px;
          }
          .chat-panel-empty-desc {
            font-size: 14px;
            color: var(--muted);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-panel-header">
        <div className="chat-panel-header-info">
          <h3 className="chat-panel-header-name">
            {conversation.participantIgName}
          </h3>
          <div className="chat-panel-header-status">
            <span className="chat-panel-online-dot" />
            <span className="chat-panel-header-label">Instagram</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        className="chat-panel-messages"
        ref={scrollContainerRef}
        onScroll={handleScroll}
      >
        {isFetchingNextPage && (
          <div className="chat-panel-loading-more">
            <span className="chat-panel-spinner" />
          </div>
        )}

        {isLoading ? (
          <div className="chat-panel-center">
            <span className="chat-panel-spinner chat-panel-spinner--lg" />
            <p className="chat-panel-center-text">Đang tải tin nhắn...</p>
          </div>
        ) : allMessages.length === 0 ? (
          <div className="chat-panel-center">
            <div className="chat-panel-msgs-empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="1.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
              </svg>
            </div>
            <p className="chat-panel-center-text">Chưa có tin nhắn nào</p>
          </div>
        ) : (
          allMessages.map((msg, index) => {
            const prevMessage = allMessages[index - 1];
            const showDate =
              !prevMessage || !isSameDay(msg.sentAt, prevMessage.sentAt);
            const dateLabel = formatDateSeparator(msg.sentAt);

            const nextMessage = allMessages[index + 1];
            const isNewestInGroup =
              !nextMessage ||
              nextMessage.senderId !== msg.senderId ||
              !isSameDay(msg.sentAt, nextMessage.sentAt);
            const showAvatar = !msg.fromShop && isNewestInGroup;

            return (
              <MessageBubble
                key={msg._id}
                message={msg}
                showDateSeparator={showDate}
                dateSeparatorLabel={dateLabel}
                showAvatar={showAvatar}
                avatarUrl={conversation.participantAvatar}
                participantName={conversation.participantIgName}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        isSending={sendMutation.isPending}
        windowStatus={windowStatus}
        participantName={conversation.participantIgName}
      />

      <style jsx>{`
        .chat-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--background);
          flex: 1;
        }

        .chat-panel-header {
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--surface);
          flex-shrink: 0;
        }
        .chat-panel-header-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .chat-panel-header-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--foreground);
          margin: 0;
        }
        .chat-panel-header-status {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .chat-panel-online-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22C55E;
        }
        .chat-panel-header-label {
          font-size: 12px;
          color: var(--muted);
        }

        .chat-panel-messages {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .chat-panel-center {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 10px;
          padding: 40px;
        }
        .chat-panel-center-text {
          font-size: 14px;
          color: var(--muted);
          margin: 0;
        }
        .chat-panel-msgs-empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: var(--surface);
          border: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chat-panel-loading-more {
          display: flex;
          justify-content: center;
          padding: 12px;
        }

        .chat-panel-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 600ms linear infinite;
        }
        .chat-panel-spinner--lg {
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
