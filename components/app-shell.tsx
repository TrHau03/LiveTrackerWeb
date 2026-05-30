"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthScreen } from "@/components/auth-screen";
import { Header } from "@/components/header";
import { useSession } from "@/components/session-provider";
import { useTheme } from "@/components/theme-provider";
import { appNavigation } from "@/lib/site";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isViewportLocked = pathname === "/livestreams" || pathname === "/customers" || pathname === "/messenger";
  const { authStatus, isAuthenticated, logout, session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Logic định hướng domain (Domain-based routing)
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const hostname = window.location.hostname;
    // Bỏ qua nếu là môi trường phát triển (localhost / 127.0.0.1)
    const isLocal = hostname === "localhost" || hostname === "127.0.0.1" || hostname.includes("192.168.");
    if (isLocal) return;

    // 1. Xử lý logic pay.livetracker.vn
    if (hostname === "pay.livetracker.vn") {
      // Valid pattern: /order/{orderId}?token={token}
      // Parse orderId from path: /order/260417-TcFF → "260417-TcFF"
      const pathSegments = window.location.pathname.split("/").filter(Boolean);
      const hasOrderPath = pathSegments.length >= 2 && pathSegments[0] === "order" && pathSegments[1];
      const hasToken = new URLSearchParams(window.location.search).has("token");

      const isValidPaymentPath = hasOrderPath && hasToken;

      if (!isValidPaymentPath) {
        window.location.replace("https://livetracker.vn");
        return;
      }
    }

    // 2. Xử lý logic app.livetracker.vn
    if (hostname === "app.livetracker.vn") {
      // Mặc định AppShell đã xử lý việc hiển thị AuthScreen nếu không phải public route.
      // Nếu bạn muốn ép buộc về trang chủ khi ở domain này, có thể bổ sung tại đây.
    }
  }, [pathname]);

  // Public routes - không cần authentication
  const publicRoutes = ["/order", "/instagram-auth-callback", "/ul"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (authStatus === "booting") {
    // Nếu là public route, render children ngay lập tức (không cần chờ booting của session)
    if (isPublicRoute) {
      return <div className="min-h-screen">{children}</div>;
    }

    return (
      <div className="flex min-h-screen items-center justify-center px-6 bg-[var(--background)]">
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--muted)] shadow-[var(--shadow-soft)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--primary)]" />
          Đang chuẩn bị không gian làm việc
        </div>
      </div>
    );
  }

  // Skip auth check cho public routes
  if (!isPublicRoute && !isAuthenticated) {
    return <AuthScreen />;
  }

  // Nếu là public route, render children trực tiếp (không có sidebar)
  if (isPublicRoute) {
    return <div className="min-h-screen">{children}</div>;
  }

  const activeItem =
    appNavigation.find((item) =>
      item.href === "/"
        ? pathname === "/"
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? appNavigation[0];
  const activeLabel =
    pathname === "/instagram-auth-callback" || pathname === "/ul"
      ? "Instagram Callback"
      : activeItem.label;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className={`flex gap-0 ${isViewportLocked ? "h-screen overflow-hidden" : "min-h-screen"}`}>
        {/* Backdrop for mobile */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar — Clean white */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] transition-all duration-200 lg:sticky lg:flex ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            } ${isCollapsed ? "w-[var(--sidebar-width-icon)] px-2 py-5" : "w-[var(--sidebar-width)] py-5 pl-4 pr-2"
            }`}
        >
          {/* Logo */}
          <div className={`mb-8 flex items-center ${isCollapsed ? "justify-center" : "justify-between px-1"}`}>
            <Link
              href="/"
              className="flex items-center gap-3 transition duration-200"
            >
              <img
                src={isCollapsed ? "/logoicon.png" : "/logo.png"}
                alt="LiveTracker Logo"
                className={`${isCollapsed ? "h-9 w-9" : "h-8 w-auto"} object-contain`}
                style={{ filter: "var(--sidebar-logo-filter)" }}
              />
            </Link>
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-[var(--sidebar-fg)] hover:bg-[var(--hover)] hover:text-[var(--sidebar-fg-hover)] transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              </button>
            )}
            {isCollapsed && (
              <button
                onClick={() => setIsCollapsed(false)}
                className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] shadow-sm transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>

          {/* Navigation Group Label */}
          {!isCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
              Main Menu
            </p>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 space-y-0.5 overflow-y-auto custom-scrollbar-premium">
            {appNavigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : ""}
                  className={`group relative flex items-center rounded-lg py-2.5 text-[13px] font-medium transition-colors duration-150 ${isCollapsed ? "justify-center px-2" : "gap-3 px-3"
                    } ${active
                      ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-fg)] font-semibold"
                      : "text-[var(--sidebar-fg)] hover:text-[var(--sidebar-fg-hover)] hover:bg-[var(--hover)]"
                    }`}
                >
                  {/* Active indicator bar */}
                  {active && !isCollapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-[var(--sidebar-active-fg)]" />
                  )}
                  <NavIcon href={item.href} active={active} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Profile Section */}
          <div className="mt-auto space-y-4">
            <div className={`flex items-center border-t border-[var(--sidebar-border)] pt-4 ${isCollapsed ? "justify-center" : "justify-between px-1"}`}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[var(--sidebar-active-bg)] flex items-center justify-center border border-[var(--border)]">
                  <span className="text-xs font-semibold text-[var(--sidebar-active-fg)] uppercase">
                    {getInitials(session.user?.fullName)}
                  </span>
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">{session.user?.fullName || "User"}</p>
                    <p className="truncate text-[11px] text-[var(--muted)]">Free Account</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <button onClick={() => void logout()} className="text-[var(--muted)] hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className={`flex min-w-0 flex-1 flex-col ${isViewportLocked ? "h-screen overflow-hidden" : "min-h-screen"}`}>
          <Header />

          <main className={`min-w-0 flex-1 ${
            pathname === "/livestreams"
              ? "px-2 sm:px-3 pt-2 pb-0 flex flex-col overflow-hidden"
              : pathname === "/messenger"
                ? "px-2 sm:px-3 pt-2 pb-0 flex flex-col overflow-hidden"
                : pathname === "/customers"
                  ? "px-2 sm:px-3 pt-2 pb-0 flex flex-col overflow-hidden"
                  : pathname === "/orders"
                    ? "px-2 sm:px-3 pt-2 pb-24 lg:pb-8"
                    : pathname === "/"
                      ? "px-2 sm:px-3 pt-2 pb-24 lg:pb-8"
                      : pathname === "/settings"
                        ? "px-2 sm:px-3 pt-2 pb-24 lg:pb-8"
                        : isViewportLocked
                          ? "px-4 sm:px-6 lg:px-8 pt-6 pb-0 flex flex-col overflow-hidden"
                          : "px-4 sm:px-6 lg:px-8 pt-6 pb-24 lg:pb-8"
          }`}>
            <div className={`w-full h-full ${isViewportLocked ? "flex flex-col flex-1 overflow-hidden" : "block max-w-[1536px] mx-auto"}`}>{children}</div>
          </main>

          {!isViewportLocked && (
            <footer className="mt-auto hidden border-t border-[var(--border)] bg-[var(--surface)] px-6 py-3 lg:block shrink-0">
              <div className="mx-auto flex max-w-[1536px] items-center justify-between text-xs text-[var(--muted)]">
                <p>© {new Date().getFullYear()} LiveTracker. All rights reserved.</p>
                <div className="flex gap-4">
                  <a href="#" className="hover:text-[var(--foreground)] transition-colors">Hỗ trợ</a>
                  <a href="#" className="hover:text-[var(--foreground)] transition-colors">Bảo mật</a>
                  <a href="#" className="hover:text-[var(--foreground)] transition-colors">Điều khoản</a>
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-sm lg:hidden">
        <div className="mx-auto w-full px-2 py-1.5">
          <div className="flex items-center justify-around gap-1">
            {appNavigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-0.5 rounded-md px-1 py-1.5 transition-colors ${active ? "text-[color:var(--primary)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                >
                  <NavIcon href={item.href} active={active} />
                  <span className="text-[10px] font-medium">{item.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

function NavIcon({ href, active }: { href: string; active: boolean }) {
  const className = `h-[18px] w-[18px] transition-colors duration-150`;

  if (href === "/") {
    return (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M3 13.125C3 12.5037 3.50368 12 4.125 12H9.375C9.99632 12 10.5 12.5037 10.5 13.125V19.875C10.5 20.4963 9.99632 21 9.375 21H4.125C3.50368 21 3 20.4963 3 19.875V13.125Z" />
        <path d="M13.5 13.125C13.5 12.5037 14.0037 12 14.625 12H19.875C20.4963 12 21 12.5037 21 13.125V19.875C21 20.4963 20.4963 21 19.875 21H14.625C14.0037 21 13.5 20.4963 13.5 19.875V13.125Z" />
        <path d="M3 4.125C3 3.50368 3.50368 3 4.125 3H9.375C9.99632 3 10.5 3.50368 10.5 4.125V8.375C10.5 8.99632 9.99632 9.5 9.375 9.5H4.125C3.50368 9.5 3 8.99632 3 8.375V4.125Z" />
        <path d="M13.5 4.125C13.5 3.50368 14.0037 3 14.625 3H19.875C20.4963 3 21 3.50368 21 4.125V8.375C21 8.99632 20.4963 9.5 19.875 9.5H14.625C14.0037 9.5 13.5 8.99632 13.5 8.375V4.125Z" />
      </svg>
    );
  }

  if (href === "/livestreams") {
    return (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M2.25 18V9A2.25 2.25 0 014.5 6.75h15a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-15A2.25 2.25 0 012.25 18z" />
        <path d="M15.75 3.75h.008v.008H15.75V3.75z" />
      </svg>
    );
  }

  if (href === "/orders") {
    return (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    );
  }

  if (href === "/messenger") {
    return (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
      </svg>
    );
  }

  if (href === "/settings") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" fill={active ? "currentColor" : "none"} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}



function getInitials(name?: string) {
  if (!name) {
    return "LT";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
