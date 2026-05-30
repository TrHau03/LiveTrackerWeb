"use client";

import React, { memo, useCallback, useState } from "react";
import type { Message, TemplateButton } from "@/types";

// ─── Utilities ───────────────────────────────────────────────────────────────

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function isSameDay(d1: string, d2: string): boolean {
  const a = new Date(d1);
  const b = new Date(d2);
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(dateString, today.toISOString())) return "Hôm nay";
  if (isSameDay(dateString, yesterday.toISOString())) return "Hôm qua";
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function getAvatarColor(name: string): string {
  const colors = ["#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F97316", "#22C55E", "#14B8A6", "#06B6D4", "#3B82F6"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

// ─── StatusIcon ──────────────────────────────────────────────────────────────

const StatusIcon = memo(function StatusIcon({ status }: { status?: Message["status"] }) {
  if (status === "sending") {
    return <span className="msg-status-spinner" />;
  }
  if (status === "sent") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.5">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  if (status === "delivered") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
        <path d="M18 7l-8 8-3-3" />
        <path d="M22 7l-8 8-1-1" />
      </svg>
    );
  }
  if (status === "failed") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    );
  }
  return null;
});

// ─── TemplateButtons ─────────────────────────────────────────────────────────

const TemplateButtonsBlock = memo(function TemplateButtonsBlock({
  buttons,
  isShop,
}: {
  buttons: TemplateButton[];
  isShop: boolean;
}) {
  if (!buttons || buttons.length === 0) return null;

  return (
    <div className="msg-template-buttons">
      {buttons.map((button, index) => {
        const isLink = button.type === "web_url" || button.type === "open_url";
        return (
          <a
            key={index}
            href={isLink && button.url ? button.url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="msg-template-btn"
            style={{
              color: isShop ? "#fff" : "var(--primary)",
              cursor: isLink ? "pointer" : "default",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="msg-template-btn-icon">
              {isLink ? (
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
              ) : (
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6M16 13H8M16 17H8M10 9H8" />
              )}
            </svg>
            <span className="msg-template-btn-text">{button.title}</span>
            {isLink && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="msg-template-btn-arrow">
                <path d="M9 18l6-6-6-6" />
              </svg>
            )}
          </a>
        );
      })}
      <style jsx>{`
        .msg-template-buttons {
          display: flex;
          flex-direction: column;
          margin-top: 8px;
          margin-left: -14px;
          margin-right: -14px;
          margin-bottom: -10px;
          border-top: 1px solid ${isShop ? "rgba(255,255,255,0.15)" : "var(--border)"};
          background: ${isShop ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.02)"};
        }
        .msg-template-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: background 150ms;
          border-bottom: 1px solid ${isShop ? "rgba(255,255,255,0.1)" : "var(--border)"};
        }
        .msg-template-btn:last-child {
          border-bottom: none;
        }
        .msg-template-btn:hover {
          background: ${isShop ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"};
        }
        .msg-template-btn-text {
          flex: 1;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :global(.msg-template-btn-icon) {
          flex-shrink: 0;
          opacity: 0.8;
        }
        :global(.msg-template-btn-arrow) {
          flex-shrink: 0;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
});

// ─── ImageViewer ─────────────────────────────────────────────────────────────

function ImageViewer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="msg-image-viewer" onClick={onClose}>
      <button type="button" className="msg-image-viewer-close" onClick={onClose}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <img src={url} alt="Preview" className="msg-image-viewer-img" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// ─── DateSeparator ───────────────────────────────────────────────────────────

export const DateSeparator = memo(function DateSeparator({ label }: { label: string }) {
  return (
    <div className="msg-date-separator">
      <div className="msg-date-line" />
      <span className="msg-date-badge">{label}</span>
      <div className="msg-date-line" />
      <style jsx>{`
        .msg-date-separator {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          gap: 12px;
          width: 100%;
        }
        .msg-date-line {
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .msg-date-badge {
          font-size: 11px;
          font-weight: 500;
          color: var(--muted);
          background: var(--surface);
          border: 1px solid var(--border);
          padding: 2px 10px;
          border-radius: 10px;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
});

// ─── MessageBubble (Main Export) ─────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  showDateSeparator: boolean;
  dateSeparatorLabel: string;
  showAvatar: boolean;
  avatarUrl?: string;
  participantName?: string;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  showDateSeparator,
  dateSeparatorLabel,
  showAvatar,
  avatarUrl,
  participantName,
}: MessageBubbleProps) {
  const isShop = message.fromShop;
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const hasAttachments = message.attachmentUrls && message.attachmentUrls.length > 0;
  const isTemplateMessage = message.messageType === "template" && message.templateData;
  const isOnlyImage = hasAttachments && !message.text && (message.messageType === "image" || !message.messageType);

  const handleImageClick = useCallback((url: string) => {
    setViewerUrl(url);
  }, []);

  return (
    <>
      {showDateSeparator && <DateSeparator label={dateSeparatorLabel} />}

      <div className={`msg-row ${isShop ? "msg-row--right" : "msg-row--left"}`}>
        {/* Avatar for customer messages */}
        {!isShop && (
          <div className="msg-avatar-slot">
            {showAvatar ? (
              avatarUrl ? (
                <img src={avatarUrl} alt={participantName || ""} className="msg-avatar" />
              ) : (
                <div
                  className="msg-avatar msg-avatar--initials"
                  style={{ backgroundColor: getAvatarColor(participantName || "U") }}
                >
                  {getInitials(participantName || "U")}
                </div>
              )
            ) : (
              <div className="msg-avatar-spacer" />
            )}
          </div>
        )}

        <div className={`msg-wrapper ${isShop ? "msg-wrapper--right" : "msg-wrapper--left"}`}>
          {/* Bubble */}
          <div className={`msg-bubble ${isShop ? "msg-bubble--shop" : "msg-bubble--customer"} ${isOnlyImage ? "msg-bubble--only-image" : ""}`}>
            {/* Attachments */}
            {hasAttachments && (
              <div className="msg-attachments">
                {message.attachmentUrls!.map((url, i) => {
                  if (message.messageType === "image" || message.messageType === "template" || !message.messageType || message.messageType === "text") {
                    return (
                      <img
                        key={i}
                        src={url}
                        alt="attachment"
                        className="msg-attachment-img"
                        onClick={() => handleImageClick(url)}
                        onLoad={(e) => {
                          e.currentTarget.dispatchEvent(new CustomEvent('message-image-loaded', { bubbles: true }));
                        }}
                      />
                    );
                  }
                  const label = message.messageType === "video" ? "Video" : message.messageType === "audio" ? "Audio" : "Tệp đính kèm";
                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="msg-attachment-link" style={{ color: isShop ? "#fff" : "var(--primary)" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.42 17.41a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                      <span>{label}</span>
                    </a>
                  );
                })}
              </div>
            )}

            {/* Text */}
            {message.text && (
              <p className={`msg-text ${hasAttachments ? "msg-text--with-attachment" : ""}`} style={{ color: isShop ? "#fff" : "var(--foreground)" }}>
                {message.text}
              </p>
            )}

            {/* Template buttons */}
            {isTemplateMessage && (
              <TemplateButtonsBlock
                buttons={message.templateData!.buttons}
                isShop={isShop}
              />
            )}
          </div>

          {/* Meta row */}
          <div className={`msg-meta ${isShop ? "msg-meta--right" : "msg-meta--left"}`}>
            <span className="msg-time">{formatTime(message.sentAt)}</span>
            {isShop && <StatusIcon status={message.status} />}
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {viewerUrl && (
        <ImageViewer url={viewerUrl} onClose={() => setViewerUrl(null)} />
      )}

      <style jsx>{`
        .msg-row {
          display: flex;
          padding: 2px 16px;
          gap: 8px;
        }
        .msg-row--left { justify-content: flex-start; }
        .msg-row--right { justify-content: flex-end; }

        .msg-avatar-slot {
          width: 32px;
          flex-shrink: 0;
          display: flex;
          align-items: flex-end;
        }
        .msg-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
        }
        .msg-avatar--initials {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 11px;
          font-weight: 700;
        }
        .msg-avatar-spacer {
          width: 28px;
        }

        .msg-wrapper {
          max-width: 65%;
        }
        .msg-wrapper--left { align-items: flex-start; display: flex; flex-direction: column; }
        .msg-wrapper--right { align-items: flex-end; display: flex; flex-direction: column; }

        .msg-bubble {
          padding: 10px 14px;
          border-radius: 18px;
          word-break: break-word;
          overflow: hidden;
        }
        .msg-bubble--shop {
          background: var(--primary);
          border-top-right-radius: 5px;
        }
        .msg-bubble--customer {
          background: var(--surface);
          border: 1px solid var(--border);
          border-top-left-radius: 5px;
        }

        .msg-text {
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
          white-space: pre-wrap;
        }
        .msg-text--with-attachment {
          margin-top: 6px;
          padding: 0 4px;
        }

        .msg-attachments {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .msg-attachment-img {
          max-width: 280px;
          max-height: 220px;
          border-radius: 14px;
          cursor: pointer;
          object-fit: cover;
          transition: opacity 150ms;
        }
        .msg-attachment-img:hover {
          opacity: 0.9;
        }
        .msg-attachment-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          text-decoration: none;
          padding: 4px;
        }

        .msg-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
          padding: 0 2px;
        }
        .msg-meta--left { justify-content: flex-start; }
        .msg-meta--right { justify-content: flex-end; }
        .msg-time {
          font-size: 11px;
          color: var(--muted);
        }

        .msg-status-spinner {
          width: 10px;
          height: 10px;
          border: 1.5px solid var(--border);
          border-top-color: var(--muted);
          border-radius: 50%;
          animation: spin 600ms linear infinite;
        }



        .msg-bubble--only-image {
          padding: 0;
          background: transparent !important;
          border: none !important;
        }
        .msg-bubble--only-image .msg-attachment-img {
          max-width: 280px;
          max-height: 280px;
          border-radius: 18px;
          object-fit: cover;
        }

        .msg-image-viewer {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .msg-image-viewer-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 150ms;
        }
        .msg-image-viewer-close:hover {
          background: rgba(255, 255, 255, 0.25);
        }
        .msg-image-viewer-img {
          max-width: 90vw;
          max-height: 90vh;
          object-fit: contain;
          border-radius: 8px;
          cursor: default;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
});

// ─── Helpers for parent (re-exported) ────────────────────────────────────────

export { isSameDay, formatDateSeparator };
