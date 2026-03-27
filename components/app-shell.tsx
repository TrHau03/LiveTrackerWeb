"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthScreen } from "@/components/auth-screen";
import { useSession } from "@/components/session-provider";
import { useTheme } from "@/components/theme-provider";
import { appNavigation } from "@/lib/site";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { authStatus, isAuthenticated, logout, session } = useSession();
  const { theme, toggleTheme } = useTheme();

  if (authStatus === "booting") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-5 py-3 text-sm font-medium text-[var(--muted)] shadow-[var(--shadow-soft)] backdrop-blur-2xl">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--primary)]" />
          Preparing workspace
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
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
      <div className="mx-auto flex min-h-screen max-w-[1680px] gap-4 px-3 py-3 sm:px-4 sm:py-4 lg:gap-6 lg:px-5 lg:py-5">
        <aside className="hidden w-[292px] shrink-0 flex-col rounded-[32px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] backdrop-blur-2xl lg:flex">
          <Link
            href="/"
            className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] px-5 py-5 shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,_var(--primary)_0%,_var(--primary-strong)_100%)] text-lg font-semibold text-white shadow-[0_18px_44px_rgba(10,132,255,0.26)]">
                L
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  LiveTracker
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  Commerce OS
                </h1>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-[var(--foreground-soft)]">
              SaaS workspace cho vận hành livestream, đơn hàng và khách hàng.
            </p>
          </Link>

          <nav className="mt-8 space-y-2">
            {appNavigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative block overflow-hidden rounded-[22px]"
                >
                  <span
                    className={`absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,_var(--primary)_0%,_var(--primary-strong)_100%)] transition-all duration-300 ${
                      active
                        ? "scale-100 opacity-100"
                        : "scale-[0.92] opacity-0 group-hover:scale-100 group-hover:opacity-100"
                    }`}
                  />
                  <span
                    className={`relative flex items-center gap-3 rounded-[22px] border px-4 py-3.5 transition-all duration-300 ${
                      active
                        ? "border-transparent text-white shadow-[0_18px_40px_rgba(10,132,255,0.22)]"
                        : "border-transparent bg-transparent text-[var(--muted)] group-hover:-translate-y-0.5 group-hover:text-white"
                    }`}
                  >
                    <NavIcon href={item.href} active={active} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,_var(--surface-strong)_0%,_var(--surface)_100%)] px-5 py-5 shadow-[var(--shadow-soft)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
              Workspace
            </p>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,_var(--primary)_0%,_var(--primary-strong)_100%)] text-sm font-semibold text-white">
                {getInitials(session.user?.fullName)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                  {session.user?.fullName || "LiveTracker user"}
                </p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {session.user?.email || "Signed in"}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-3 rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-soft)]">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition hover:-translate-y-0.5 hover:border-[color:var(--primary-soft)]"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,_var(--primary)_0%,_var(--primary-strong)_100%)] px-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(10,132,255,0.2)] transition hover:-translate-y-0.5"
            >
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col gap-4">
          <header className="sticky top-3 z-30 rounded-[28px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
                  SaaS Workspace
                </p>
                <h2 className="mt-1 truncate text-[28px] font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {activeLabel}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] text-[var(--foreground)] transition hover:-translate-y-0.5 lg:hidden"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                </button>
                <div className="hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 text-right shadow-[var(--shadow-soft)] sm:block">
                  <p className="text-xs font-semibold text-[var(--foreground)]">
                    {session.user?.fullName || "LiveTracker user"}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    {session.user?.role || "operator"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 pb-24 lg:pb-3">
            <div className="mx-auto w-full max-w-[1260px] px-1">{children}</div>
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-4 z-40 lg:hidden">
        <div className="mx-auto w-[calc(100%-1.5rem)] max-w-md rounded-[30px] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-strong)] backdrop-blur-2xl">
          <div className="grid grid-cols-4 gap-1.5">
            {appNavigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative overflow-hidden rounded-[22px]"
                >
                  <span
                    className={`absolute inset-0 rounded-[22px] bg-[linear-gradient(135deg,_var(--primary)_0%,_var(--primary-strong)_100%)] transition-all duration-300 ${
                      active
                        ? "scale-100 opacity-100"
                        : "scale-[0.9] opacity-0 group-hover:scale-100 group-hover:opacity-100"
                    }`}
                  />
                  <span
                    className={`relative flex flex-col items-center gap-1.5 rounded-[22px] px-2 py-2.5 transition-all duration-300 ${
                      active
                        ? "-translate-y-0.5 text-white"
                        : "text-[var(--muted)] group-hover:-translate-y-0.5 group-hover:text-white"
                    }`}
                  >
                    <NavIcon href={item.href} active={active} />
                    <span className="text-[11px] font-semibold">{item.shortLabel}</span>
                  </span>
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
  const className = `h-5 w-5 transition-transform duration-300 ${
    active ? "scale-110" : "group-hover:scale-110"
  }`;

  if (href === "/") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (href === "/livestreams") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <rect
          x="4"
          y="6"
          width="16"
          height="12"
          rx="4"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    );
  }

  if (href === "/orders") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className}>
        <path
          d="M5 7h14M7 11h10M8 15h8M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6 18.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm12 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9ZM6 9.5V8a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M20 14.5A7.5 7.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
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
