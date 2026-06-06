/**
 * NotificationDropdown — Notification center popup on the Header.
 */
"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useNotifications, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useDeleteNotification } from "@/hooks/use-notifications";
import { Bell, Check, Trash2, ShieldCheck, ShoppingBag, Radio, HelpCircle, AlertTriangle, MessageCircle, RefreshCw } from "lucide-react";
import { formatDateTime, extractCollection } from "@/lib/proxy-client";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const { data: notifData = [], isLoading } = useNotifications({ page: 1, limit: 15 });
  const items = extractCollection(notifData);

  const markReadMutation = useMarkNotificationAsRead();
  const markAllReadMutation = useMarkAllNotificationsAsRead();
  const deleteMutation = useDeleteNotification();

  // Count unread notifications
  const unreadCount = useMemo(() => {
    return items.filter((item: any) => !item.isRead).length;
  }, [items]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await markReadMutation.mutateAsync(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (item: any) => {
    // Đánh dấu đã đọc thông báo trước
    await handleMarkRead(item._id, item.isRead);

    // Xử lý chuyển hướng dựa trên loại thông báo (notification type)
    if (item.type === "LIVE_STARTED" || item.type === "LIVE_ENDED" || item.type === "new_live") {
      const liveId = item.liveId || item.metadata?.liveId || item.data?.liveId;
      if (liveId) {
        router.push(`/livestreams?liveId=${liveId}`);
      } else {
        router.push("/livestreams");
      }
      setIsOpen(false);
    } else if (item.type === "ORDER_CREATED" || item.type === "ORDER_UPDATED") {
      router.push("/orders");
      setIsOpen(false);
    } else if (item.type === "INSTAGRAM_LINKED" || item.type === "INSTAGRAM_UNLINKED") {
      router.push("/settings");
      setIsOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllReadMutation.mutateAsync();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteMutation.mutateAsync(id);
    } catch (e) {
      console.error(e);
    }
  };

  // Get matching icon & color based on notification type
  const getNotificationIcon = (type: string) => {
    const iconClass = "w-4 h-4 shrink-0";
    switch (type) {
      case "ORDER_CREATED":
      case "ORDER_UPDATED":
        return <ShoppingBag className={`${iconClass} text-emerald-500`} />;
      case "LIVE_STARTED":
      case "LIVE_ENDED":
      case "new_live":
        return <Radio className={`${iconClass} text-pink-500`} />;
      case "INSTAGRAM_LINKED":
      case "INSTAGRAM_UNLINKED":
        return <MessageCircle className={`${iconClass} text-blue-500`} />;
      case "SYSTEM_ALERT":
        return <AlertTriangle className={`${iconClass} text-amber-500`} />;
      default:
        return <HelpCircle className={`${iconClass} text-[var(--muted)]`} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground-soft)] hover:bg-[var(--hover)] hover:text-[var(--foreground)] transition-all shadow-sm"
        title="Thông báo hệ thống"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-[var(--surface)] animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 z-50 mt-2 w-80 sm:w-96 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-muted)]/30">
              <span className="font-bold text-xs text-[var(--foreground)]">Thông báo hệ thống</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-bold text-[var(--primary)] hover:text-blue-600 transition flex items-center gap-0.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Đọc tất cả
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto max-h-80 custom-scrollbar-premium divide-y divide-[var(--border)]/40">
              {isLoading && items.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--muted)] flex items-center justify-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang tải thông báo...
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--muted)]">
                  Chưa có thông báo nào.
                </div>
              ) : (
                items.map((item: any) => (
                  <div
                    key={item._id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-[var(--hover)] transition cursor-pointer select-none group relative ${
                      !item.isRead ? "bg-blue-500/[0.03] font-medium" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div className="mt-0.5 shrink-0">
                      {getNotificationIcon(item.type)}
                    </div>

                    {/* Content text */}
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-xs text-[var(--foreground)] leading-normal break-words">
                        {item.title}
                      </p>
                      {item.message && (
                        <p className="text-[10px] text-[var(--muted)] mt-1 font-normal leading-normal line-clamp-2">
                          {item.message}
                        </p>
                      )}
                      <p className="text-[9px] text-[var(--muted)] mt-1.5 font-normal">
                        {formatDateTime(item.createdAt)}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      <button
                        onClick={(e) => handleDelete(e, item._id)}
                        className="p-1 rounded text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                        title="Xóa thông báo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Unread indicator dot */}
                    {!item.isRead && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full group-hover:hidden" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
