"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import { appNavigation } from "@/lib/site";
import { useSession } from "@/components/session-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, setSession } = useSession();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const connectionLabel = useMemo(() => {
    if (!session.baseUrl) {
      return "Chưa cấu hình backend";
    }
    if (!session.accessToken) {
      return "Có backend, thiếu access token";
    }
    return "Sẵn sàng gọi API";
  }, [session.accessToken, session.baseUrl]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(236,107,83,0.12),_transparent_26%),radial-gradient(circle_at_bottom_left,_rgba(20,74,104,0.13),_transparent_35%),linear-gradient(180deg,_#f6efe7_0%,_#f4ebe1_46%,_#efe5db_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-[292px] shrink-0 border-r border-slate-900/10 bg-[#102b3b] px-5 py-6 text-white lg:flex lg:flex-col">
          <Link href="/" className="rounded-[28px] border border-white/10 bg-white/6 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
              LiveTracker Web
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em]">
              Webhook command center
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Dashboard, livestream listener, orders, customers và API studio
              trong cùng một shell responsive.
            </p>
          </Link>

          <nav className="mt-6 space-y-2">
            {appNavigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-[24px] border px-4 py-4 transition ${
                    active
                      ? "border-transparent bg-white text-[#102b3b] shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
                      : "border-white/10 bg-white/5 text-white/80 hover:border-white/20 hover:bg-white/8 hover:text-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-current/55">
                      {item.shortLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-current/70">
                    {item.description}
                  </p>
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="mt-auto rounded-[26px] border border-white/10 bg-white/6 p-4 text-left transition hover:border-white/20 hover:bg-white/8"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
              Connection
            </p>
            <p className="mt-2 text-lg font-semibold">{connectionLabel}</p>
            <p className="mt-2 break-all text-xs leading-6 text-white/68">
              {session.baseUrl || "http://localhost:3000"}
            </p>
          </button>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-900/10 bg-white/72 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  LiveTracker workspace
                </p>
                <p className="mt-1 text-sm text-slate-600">{connectionLabel}</p>
              </div>

              <button
                type="button"
                onClick={() =>
                  startTransition(() => {
                    setIsSettingsOpen(true);
                  })
                }
                className="inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_12px_32px_rgba(53,34,14,0.08)] transition hover:border-slate-900/20 hover:text-slate-950"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#ed6f57]" />
                Backend settings
              </button>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-6 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-900/10 bg-white/92 px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5 gap-2">
          {appNavigation.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-2xl px-2 py-2 text-center text-[11px] font-semibold transition ${
                  active
                    ? "bg-[#102b3b] text-white shadow-[0_16px_30px_rgba(16,43,59,0.22)]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <div className="text-[10px] uppercase tracking-[0.18em]">
                  {item.shortLabel}
                </div>
                <div className="mt-1">{item.label}</div>
              </Link>
            );
          })}
        </div>
      </nav>

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setIsSettingsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-slate-900/10 bg-[#fff9f2] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.18)] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Runtime settings
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  API connection
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Các màn dashboard, livestreams, orders, customers và API
                  studio đều đọc cùng một session backend.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="rounded-full border border-slate-900/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:border-slate-900/20 hover:text-slate-950"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <SettingsField
                label="Backend origin"
                hint="Dùng origin backend, ví dụ http://localhost:3000"
              >
                <input
                  value={session.baseUrl}
                  onChange={(event) =>
                    setSession({
                      ...session,
                      baseUrl: event.target.value,
                    })
                  }
                  className="h-12 rounded-2xl border border-slate-900/10 bg-white px-4 text-sm outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
                />
              </SettingsField>

              <SettingsField
                label="Access token"
                hint="Tự động cập nhật nếu login hoặc refresh thành công."
              >
                <textarea
                  rows={5}
                  value={session.accessToken}
                  onChange={(event) =>
                    setSession({
                      ...session,
                      accessToken: event.target.value,
                    })
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
                />
              </SettingsField>

              <SettingsField
                label="Refresh token"
                hint="Proxy sẽ retry một lần khi gặp 401."
              >
                <textarea
                  rows={5}
                  value={session.refreshToken}
                  onChange={(event) =>
                    setSession({
                      ...session,
                      refreshToken: event.target.value,
                    })
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
                />
              </SettingsField>

              <SettingsField
                label="Admin token cookie"
                hint="Dùng cho OTA và HTML admin routes cần cookie adminToken."
              >
                <textarea
                  rows={4}
                  value={session.adminToken}
                  onChange={(event) =>
                    setSession({
                      ...session,
                      adminToken: event.target.value,
                    })
                  }
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
                />
              </SettingsField>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <StatusCard
                label="Bearer session"
                value={session.accessToken ? "Ready" : "Missing"}
                active={Boolean(session.accessToken)}
              />
              <StatusCard
                label="Admin cookie"
                value={session.adminToken ? "Ready" : "Missing"}
                active={Boolean(session.adminToken)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SettingsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      {children}
      <span className="text-xs leading-6 text-slate-500">{hint}</span>
    </label>
  );
}

function StatusCard({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border px-4 py-4 ${
        active
          ? "border-[#ed6f57]/35 bg-[#ed6f57]/10 text-slate-950"
          : "border-slate-900/10 bg-white text-slate-600"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-current/60">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
