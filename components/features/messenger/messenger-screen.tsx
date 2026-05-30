"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Conversation } from "@/types";
import { ConversationList } from "./conversation-list";
import { ChatPanel } from "./chat-panel";
import { useHeaderStore } from "@/lib/store/header-store";

// ─── Component ───────────────────────────────────────────────────────────────

export function MessengerScreen() {
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);

  const setHeader = useHeaderStore((state) => state.setHeader);
  const resetHeader = useHeaderStore((state) => state.resetHeader);

  useEffect(() => {
    setHeader({
      title: "Tin Nhắn",
      subtitle: "Messenger Instagram",
      showDateRange: false,
      actions: [],
    });
    return () => resetHeader();
  }, [setHeader, resetHeader]);

  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      setActiveConversation(conversation);
      setShowChatOnMobile(true);
    },
    [],
  );

  const handleBackToList = useCallback(() => {
    setShowChatOnMobile(false);
  }, []);

  return (
    <div className="messenger-screen">
      {/* Conversation List (Left Panel) */}
      <div
        className={`messenger-sidebar ${showChatOnMobile ? "messenger-sidebar--hidden-mobile" : ""}`}
      >
        <ConversationList
          activeConversationId={activeConversation?._id ?? null}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat Panel (Right Panel) */}
      <div
        className={`messenger-main ${!showChatOnMobile ? "messenger-main--hidden-mobile" : ""}`}
      >
        {/* Mobile back button */}
        {showChatOnMobile && activeConversation && (
          <button
            type="button"
            className="messenger-back-btn"
            onClick={handleBackToList}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Quay lại</span>
          </button>
        )}
        <ChatPanel conversation={activeConversation} />
      </div>

      <style jsx>{`
        .messenger-screen {
          display: flex;
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid var(--border);
          background: var(--surface);
          box-shadow: var(--shadow-soft);
        }

        .messenger-sidebar {
          width: 360px;
          min-width: 300px;
          flex-shrink: 0;
          height: 100%;
          overflow: hidden;
        }

        .messenger-main {
          flex: 1;
          min-width: 0;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .messenger-back-btn {
          display: none;
        }

        @media (max-width: 768px) {
          .messenger-sidebar {
            width: 100%;
            flex: 1;
          }
          .messenger-sidebar--hidden-mobile {
            display: none;
          }

          .messenger-main {
            width: 100%;
          }
          .messenger-main--hidden-mobile {
            display: none;
          }

          .messenger-back-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 16px;
            background: var(--surface);
            border: none;
            border-bottom: 1px solid var(--border);
            color: var(--primary);
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            font-family: inherit;
            flex-shrink: 0;
          }
          .messenger-back-btn:hover {
            background: var(--hover);
          }
        }
      `}</style>
    </div>
  );
}
