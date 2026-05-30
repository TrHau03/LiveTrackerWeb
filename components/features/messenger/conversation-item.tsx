"use client";

import React, { memo } from "react";
import type { Conversation } from "@/types";

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return "";

  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút`;
  if (diffHour < 24) return `${diffHour} giờ`;
  if (diffDay === 1) return "Hôm qua";

  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
  "#EAB308", "#22C55E", "#14B8A6", "#06B6D4", "#3B82F6",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ConversationItemProps {
  item: Conversation;
  isActive: boolean;
  onPress: () => void;
}

export const ConversationItem = memo(function ConversationItem({
  item,
  isActive,
  onPress,
}: ConversationItemProps) {
  const isUnread = item.unreadCount > 0;
  const avatarColor = getAvatarColor(item.participantIgName);

  return (
    <button
      type="button"
      onClick={onPress}
      className="conversation-item"
      style={{
        backgroundColor: isActive
          ? "var(--primary-soft)"
          : isUnread
            ? "rgba(37, 99, 235, 0.03)"
            : "transparent",
        borderLeft: isActive ? "3px solid var(--primary)" : "3px solid transparent",
      }}
    >
      {/* Avatar */}
      {item.participantAvatar ? (
        <img
          src={item.participantAvatar}
          alt={item.participantIgName}
          className="conversation-avatar"
        />
      ) : (
        <div
          className="conversation-avatar conversation-avatar--initials"
          style={{ backgroundColor: avatarColor }}
        >
          {getInitials(item.participantIgName)}
        </div>
      )}

      {/* Content */}
      <div className="conversation-content">
        <div className="conversation-top-row">
          <span
            className="conversation-name"
            style={{ fontWeight: isUnread ? 700 : 500 }}
          >
            {item.participantIgName}
          </span>
          <span
            className="conversation-time"
            style={{
              color: isUnread ? "var(--primary)" : "var(--muted)",
            }}
          >
            {formatRelativeTime(item.lastMessageAt)}
          </span>
        </div>

        <div className="conversation-bottom-row">
          <span
            className="conversation-last-message"
            style={{
              color: isUnread ? "var(--foreground)" : "var(--muted)",
              fontWeight: isUnread ? 500 : 400,
            }}
          >
            {item.lastMessageFromShop
              ? `Bạn: ${item.lastMessageText || ""}`
              : item.lastMessageText || ""}
          </span>

          {isUnread && (
            <span className="conversation-badge">
              {item.unreadCount > 99 ? "99+" : item.unreadCount}
            </span>
          )}
        </div>
      </div>

      <style jsx>{`
        .conversation-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          width: 100%;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background-color 150ms ease;
          font-family: inherit;
        }
        .conversation-item:hover {
          background-color: var(--hover) !important;
        }

        .conversation-avatar {
          width: 48px;
          height: 48px;
          min-width: 48px;
          border-radius: 50%;
          object-fit: cover;
        }
        .conversation-avatar--initials {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 16px;
          font-weight: 700;
        }

        .conversation-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .conversation-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .conversation-name {
          font-size: 14px;
          color: var(--foreground);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-right: 8px;
        }
        .conversation-time {
          font-size: 11px;
          flex-shrink: 0;
        }

        .conversation-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .conversation-last-message {
          font-size: 13px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          margin-right: 8px;
        }

        .conversation-badge {
          background: var(--primary);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          min-width: 20px;
          height: 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
          flex-shrink: 0;
        }
      `}</style>
    </button>
  );
});
