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
  const { authStatus, isAuthenticated, logout, session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Public routes - không cần authentication
  const publicRoutes = ["/order", "/instagram-auth-callback", "/ul"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (authStatus === "booting") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--muted)] shadow-[var(--shadow-soft)] backdrop-blur-2xl">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary)]" />
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
    <div className="min-h-screen">
      <div className={`mx-auto flex gap-0 bg-[var(--background)] ${pathname === "/livestreams" ? "h-screen overflow-hidden" : "min-h-screen"}`}>
        {/* Backdrop for mobile */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-300 lg:sticky lg:flex ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            } ${isCollapsed ? "w-[var(--sidebar-width-icon)] px-4 py-6" : "w-[var(--sidebar-width)] p-6"
            }`}
        >
          <div className={`mb-10 flex items-center ${isCollapsed ? "justify-center" : "justify-between px-2"}`}>
            <Link
              href="/"
              className="flex items-center gap-3 transition duration-300"
            >
              <img
                src={isCollapsed ? "/logoicon.png" : (theme === "dark" ? "/logo.png" : "/logo-2.png")}
                alt="LiveTracker Logo"
                className={`${isCollapsed ? "h-11 w-11" : "h-9 w-auto"} object-contain`}
              />
            </Link>
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              </button>
            )}
            {isCollapsed && (
              <button
                onClick={() => setIsCollapsed(false)}
                className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)] shadow-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
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
                  className={`group flex items-center rounded-xl p-3 text-sm font-semibold transition-all duration-200 ${isCollapsed ? "justify-center" : "gap-4 px-4"
                    } ${active
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                    }`}
                >
                  <NavIcon href={item.href} active={active} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-6">
            {/* Upgrade Card */}
            {!isCollapsed && (
              <div className="relative overflow-hidden rounded-2xl bg-[var(--primary)] p-5 text-white shadow-lg shadow-[var(--primary-soft)]">
                <div className="relative z-10">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <button className="w-full rounded-xl bg-white py-2.5 text-xs font-bold text-[var(--primary)] transition hover:bg-opacity-90">
                    Upgrade Now
                  </button>
                </div>
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
              </div>
            )}

            {/* Profile Section */}
            <div className={`flex items-center border-t border-[var(--border)] pt-6 ${isCollapsed ? "justify-center" : "justify-between"}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--primary-soft)]">
                  <button className="flex h-full w-full items-center justify-center text-xs font-bold text-[var(--primary)] uppercase">
                    {getInitials(session.user?.fullName)}
                  </button>
                </div>
                {!isCollapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--foreground)]">{session.user?.fullName || "Easin Arafat"}</p>
                    <p className="truncate text-xs text-[var(--muted)]">Free Account</p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <button onClick={() => void logout()} className="text-[var(--muted)] hover:text-red-500 transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
              )}
            </div>
          </div>
        </aside>

        <div className={`flex min-w-0 flex-1 flex-col ${pathname === "/livestreams" ? "h-screen overflow-hidden" : "min-h-screen"}`}>
          <Header />

          <main className={`min-w-0 flex-1 px-4 sm:px-8 ${pathname === "/livestreams" ? "pb-0 flex flex-col overflow-hidden" : "pb-24 lg:pb-8"}`}>
            <div className={`w-full ${pathname === "/livestreams" ? "flex-1 overflow-hidden" : ""}`}>{children}</div>
          </main>

          <footer className="mt-auto hidden border-t border-[var(--border)] bg-[var(--surface)] px-6 py-4 lg:block shrink-0">
            <div className="mx-auto flex max-w-[1200px] items-center justify-between text-xs text-[var(--muted)]">
              <p>© {new Date().getFullYear()} LiveTracker. All rights reserved.</p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-[var(--foreground)]">Hỗ trợ</a>
                <a href="#" className="hover:text-[var(--foreground)]">Bảo mật</a>
                <a href="#" className="hover:text-[var(--foreground)]">Điều khoản</a>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md lg:hidden">
        <div className="mx-auto w-full px-2 py-2">
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
                  className={`flex flex-1 flex-col items-center gap-1 rounded-md px-1 py-2 transition-colors ${active ? "text-[color:var(--primary)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
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
  const className = `h-5 w-5 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"
    }`;

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

  if (href === "/settings") {
    return (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className={className}>
        <path d="M4.5 12a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0z" />
        <path d="M12 9v3m0 0v3m0-3h3m-3 0H9" />
      </svg>
    )
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
