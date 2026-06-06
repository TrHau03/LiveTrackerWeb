"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useConfigHeader } from "@/hooks/use-config-header";
import { useHeaderStore } from "@/stores/header-store";
import { NotificationDropdown } from "@/components/notification-dropdown";
import { useLocalBridge } from "@/hooks/use-local-bridge";
import { Printer, RefreshCw } from "lucide-react";



export function Header() {
  const config = useConfigHeader();
  const dynamicHeader = useHeaderStore();
  const pathname = usePathname();
  const { isConnected: isBridgeConnected, isChecking: isBridgeChecking } = useLocalBridge();

  const isCompactPadding =
    pathname === "/livestreams" ||
    pathname === "/messenger" ||
    pathname === "/customers" ||
    pathname === "/orders" ||
    pathname === "/";

  const title = dynamicHeader.title || config.title;
  const subtitle = dynamicHeader.subtitle || config.subtitle;
  const showDateRange = dynamicHeader.showDateRange !== undefined ? dynamicHeader.showDateRange : config.showDateRange;
  const actions = dynamicHeader.actions.length > 0 ? dynamicHeader.actions : (config.actions || []);

  return (
    <header
      className={`${
        isCompactPadding ? "px-2 sm:px-3" : "px-4 sm:px-6 lg:px-8"
      } py-3 border-b border-[var(--header-border)] bg-[var(--header-bg)] sticky top-0 z-30 transition-colors duration-200`}
    >
      <div className="flex flex-col gap-2 w-full">

        {/* Main Row: Title & Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-[var(--header-fg)] truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[var(--header-fg-muted)] mt-0.5 truncate font-normal">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Custom Content Area (e.g., Period Selectors) */}
            {dynamicHeader.customContent && (
              <div className="hidden lg:flex items-center mr-1">
                {dynamicHeader.customContent}
              </div>
            )}

            {/* Date Range Controls */}
            {showDateRange && (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground-soft)] border border-[var(--border)] hover:border-[var(--primary)] transition cursor-pointer">
                  <svg className="h-3.5 w-3.5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span>{dynamicHeader.startDate || "10-06-2021"}</span>
                </div>
                <span className="text-[var(--muted)] text-xs">→</span>
                <div className="flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--foreground-soft)] border border-[var(--border)] hover:border-[var(--primary)] transition cursor-pointer">
                  <span>{dynamicHeader.endDate || "10-10-2021"}</span>
                </div>
              </div>
            )}

            {/* Desktop Actions */}
            {actions.length > 0 && (
              <div className="hidden lg:flex items-center gap-2">
                {actions.map((action, idx) => {
                  if (action.hidden) return null;
                  const buttonClasses = {
                    primary: "inline-flex h-9 items-center justify-center rounded-lg bg-[var(--accent-green)] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[var(--accent-green-strong)]",
                    secondary: "inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--hover)]",
                    danger: "inline-flex h-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-xs font-medium text-red-600 transition hover:bg-red-100",
                  };
                  return (
                    <button
                      key={action.id || action.label || `action-${idx}`}
                      onClick={action.onClick}
                      className={`${buttonClasses[action.variant || "secondary"]} ${action.className || ""}`}
                    >
                      {action.icon && <span className="mr-1.5">{action.icon}</span>}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Local Bridge Status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-xs shrink-0 select-none">
              {isBridgeChecking ? (
                <div className="flex items-center gap-1 text-[var(--muted)]" title="Đang kiểm tra kết nối với cầu nối in ấn...">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--primary)]" />
                  <span className="hidden sm:inline">Đang quét...</span>
                </div>
              ) : isBridgeConnected ? (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium" title="Cầu nối máy in nhiệt đang hoạt động">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <Printer className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  <span className="hidden sm:inline text-[11px] font-bold">Bridge Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400 font-medium" title="Không kết nối được với ứng dụng in ấn cục bộ">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <Printer className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                  <span className="hidden sm:inline text-[11px] font-bold">Bridge Offline</span>
                </div>
              )}
            </div>

            {/* Notification Dropdown */}
            <NotificationDropdown />
          </div>
        </div>

        {/* Bottom Row: Mobile Custom Content or Actions */}
        {(dynamicHeader.customContent || actions.length > 0) && (
          <div className="flex lg:hidden flex-wrap gap-2 items-center">
            {dynamicHeader.customContent}
            {actions.map((action, idx) => {
              if (action.hidden) return null;
              const buttonClasses = {
                primary: "inline-flex h-8 items-center justify-center rounded-lg bg-[var(--accent-green)] px-3 text-xs font-semibold text-white transition hover:bg-[var(--accent-green-strong)]",
                secondary: "inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--hover)]",
                danger: "inline-flex h-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-600 transition hover:bg-red-100",
              };
              return (
                <button key={action.id || action.label || `btn-${idx}`} onClick={action.onClick} className={`${buttonClasses[action.variant || "secondary"]} ${action.className || ""}`}>
                  {action.icon && <span className="mr-1.5">{action.icon}</span>}
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
