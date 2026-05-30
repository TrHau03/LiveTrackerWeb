"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import type { WindowStatus } from "@/types";
import { useSession } from "@/components/session-provider";

// ─── WindowStatusBanner ──────────────────────────────────────────────────────

const WindowStatusBanner = memo(function WindowStatusBanner({
  status,
}: {
  status: WindowStatus;
}) {
  if (status === "human_agent") {
    return (
      <div className="chat-input-banner chat-input-banner--warning">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span>Cửa sổ 24h đã hết. Tin nhắn sẽ được gửi với tag Human Agent (hạn 7 ngày).</span>
      </div>
    );
  }

  if (status === "closed") {
    return (
      <div className="chat-input-banner chat-input-banner--closed">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#991B1B" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
        <span>Cửa sổ nhắn tin đã đóng (hơn 7 ngày). Không thể gửi tin nhắn.</span>
      </div>
    );
  }

  return null;
});

// ─── ChatInput ───────────────────────────────────────────────────────────────

interface ChatInputProps {
  onSend: (text: string) => void;
  isSending?: boolean;
  windowStatus?: WindowStatus;
  participantName?: string;
}

export function ChatInput({
  onSend,
  isSending = false,
  windowStatus = "open",
  participantName,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const isClosed = windowStatus === "closed";
  const canSend = text.trim().length > 0 && !isSending && !isClosed;

  // Load message templates from session user profile
  const { session } = useSession();
  const user = session?.user;
  const messageTemplate = user?.messageTemplate;

  const normalizeTemplates = useCallback((templates: any) => {
    if (!templates || !Array.isArray(templates)) return [];
    return templates.map((t: any) => {
      if (typeof t === "string") {
        return { content: t, isActive: true };
      }
      return {
        content: t.content || t.template || "",
        isActive: t.isActive !== false,
      };
    });
  }, []);

  const templates = useMemo(() => {
    if (!messageTemplate) return [];
    const list: Array<{ label: string; content: string; type: string }> = [];

    // 1. Order templates
    let orderList: any[] = [];
    if (Array.isArray(messageTemplate)) {
      orderList = normalizeTemplates(messageTemplate);
    } else if (messageTemplate.order) {
      const orderData = messageTemplate.order;
      if (orderData && typeof orderData === "object" && !Array.isArray(orderData) && "template" in orderData) {
        orderList = normalizeTemplates(orderData.template);
      } else {
        orderList = normalizeTemplates(orderData);
      }
    }
    orderList.forEach((t) => {
      if (t.isActive && t.content) list.push({ label: "Đơn hàng", content: t.content, type: "order" });
    });

    // 2. Comment templates
    if (messageTemplate.comment) {
      normalizeTemplates(messageTemplate.comment).forEach((t) => {
        if (t.isActive && t.content) list.push({ label: "Bình luận", content: t.content, type: "comment" });
      });
    }

    // 3. Backup templates
    if (messageTemplate.backup) {
      normalizeTemplates(messageTemplate.backup).forEach((t) => {
        if (t.isActive && t.content) list.push({ label: "Dự bị", content: t.content, type: "backup" });
      });
    }

    // 4. Error templates
    if (messageTemplate.error) {
      normalizeTemplates(messageTemplate.error).forEach((t) => {
        if (t.isActive && t.content) list.push({ label: "Lỗi", content: t.content, type: "error" });
      });
    }

    // 5. New customer templates
    if (messageTemplate.newCustomer) {
      normalizeTemplates(messageTemplate.newCustomer).forEach((t) => {
        if (t.isActive && t.content) list.push({ label: "Khách mới", content: t.content, type: "newCustomer" });
      });
    }

    return list;
  }, [messageTemplate, normalizeTemplates]);

  const handleSelectTemplate = useCallback((templateContent: string) => {
    let filled = templateContent;
    if (participantName) {
      filled = filled.replace(/\{\{Ten_Khach_Hang\}\}/g, participantName);
    }
    setText(filled);
  }, [participantName]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isSending || isClosed) return;
    onSend(trimmed);
    setText("");
  }, [text, isSending, isClosed, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div className="chat-input-container">
      <WindowStatusBanner status={windowStatus} />

      {/* Quick response templates horizontal pills */}
      {templates.length > 0 && !isClosed && (
        <div className="chat-input-templates">
          <span className="chat-input-templates-title">Mẫu nhanh:</span>
          <div className="chat-input-templates-list">
            {templates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                className={`chat-input-template-pill chat-input-template-pill--${tpl.type}`}
                onClick={() => handleSelectTemplate(tpl.content)}
                title={tpl.content}
              >
                <span className="chat-input-template-label">{tpl.label}</span>
                <span className="chat-input-template-text">
                  {tpl.content.length > 35 ? tpl.content.substring(0, 35) + "..." : tpl.content}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chat-input-row">
        <div
          className="chat-input-field-wrapper"
          style={{
            opacity: isClosed ? 0.5 : 1,
          }}
        >
          <textarea
            className="chat-input-field"
            placeholder={
              isClosed
                ? "Cửa sổ nhắn tin đã đóng"
                : "Nhập tin nhắn..."
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isClosed}
            maxLength={2000}
            rows={1}
          />
        </div>

        <button
          type="button"
          className="chat-input-send-btn"
          onClick={handleSend}
          disabled={!canSend}
          style={{
            background: canSend ? "var(--primary)" : "var(--border)",
          }}
        >
          {isSending ? (
            <span className="chat-input-spinner" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={canSend ? "#fff" : "var(--muted)"} strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>

      <style jsx>{`
        .chat-input-container {
          padding: 10px 16px 16px;
          border-top: 1px solid var(--border);
          background: var(--surface);
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }

        .chat-input-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 500;
          line-height: 1.4;
        }
        .chat-input-banner--warning {
          background: #FEF3C7;
          color: #92400E;
        }
        .chat-input-banner--closed {
          background: #FEE2E2;
          color: #991B1B;
        }
        .chat-input-banner svg {
          flex-shrink: 0;
        }

        /* Templates styles */
        .chat-input-templates {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 6px;
          border-bottom: 1px dashed var(--border);
          overflow: hidden;
        }
        .chat-input-templates-title {
          font-size: 10px;
          font-weight: 700;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }
        .chat-input-templates-list {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
          width: 100%;
        }
        .chat-input-templates-list::-webkit-scrollbar {
          height: 4px;
        }
        .chat-input-templates-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-input-templates-list::-webkit-scrollbar-thumb {
          background: var(--border);
          border-radius: 2px;
        }
        .chat-input-template-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          border: 1px solid var(--border);
          background: var(--surface);
          transition: all 150ms;
        }
        .chat-input-template-pill:hover {
          background: var(--background);
          border-color: var(--primary);
        }
        .chat-input-template-label {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 1px 4px;
          border-radius: 4px;
        }
        .chat-input-template-pill--order .chat-input-template-label { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
        .chat-input-template-pill--comment .chat-input-template-label { background: rgba(16, 185, 129, 0.1); color: #10B981; }
        .chat-input-template-pill--backup .chat-input-template-label { background: rgba(139, 92, 246, 0.1); color: #8B5CF6; }
        .chat-input-template-pill--error .chat-input-template-label { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
        .chat-input-template-pill--newCustomer .chat-input-template-label { background: rgba(249, 115, 22, 0.1); color: #F97316; }

        .chat-input-template-text {
          color: var(--foreground);
          font-weight: 400;
        }

        .chat-input-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }

        .chat-input-field-wrapper {
          flex: 1;
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 0 16px;
          background: var(--background);
          transition: border-color 150ms;
        }
        .chat-input-field-wrapper:focus-within {
          border-color: var(--primary);
        }

        .chat-input-field {
          width: 100%;
          border: none;
          background: transparent;
          outline: none;
          font-size: 14px;
          color: var(--foreground);
          padding: 10px 0;
          line-height: 1.4;
          resize: none;
          max-height: 120px;
          min-height: 20px;
          font-family: inherit;
        }
        .chat-input-field::placeholder {
          color: var(--muted);
        }
        .chat-input-field:disabled {
          cursor: not-allowed;
        }

        .chat-input-send-btn {
          width: 42px;
          height: 42px;
          min-width: 42px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 150ms, transform 100ms;
        }
        .chat-input-send-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: scale(1.05);
        }
        .chat-input-send-btn:disabled {
          cursor: not-allowed;
        }

        .chat-input-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 600ms linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
