"use client";

import { FormEvent, useState } from "react";

import { useSession } from "@/components/session-provider";

export function AuthScreen() {
  const { isLoggingIn, login, loginError } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await login({ email, password });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-[1320px] overflow-hidden rounded-[36px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-strong)] backdrop-blur-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden bg-[linear-gradient(145deg,_rgba(10,132,255,0.98)_0%,_rgba(37,99,235,0.96)_52%,_rgba(90,200,250,0.9)_100%)] px-7 py-8 text-white sm:px-9 sm:py-10 lg:px-10 lg:py-12">
          <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_70%)]" />
          <div className="absolute -right-14 top-8 h-40 w-40 rounded-full bg-white/14 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-slate-950/18 blur-3xl" />

          <div className="relative flex h-full flex-col">
            <span className="inline-flex w-fit rounded-full border border-white/18 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/84">
              LiveTracker SaaS
            </span>

            <div className="mt-8 max-w-xl">
              <h1 className="text-4xl font-semibold tracking-[-0.05em] md:text-5xl">
                Commerce control room cho đội bán hàng realtime.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-8 text-white/78 md:text-base">
                Theo dõi livestream, xử lý đơn hàng và chăm sóc khách hàng trong
                một giao diện sáng tối sạch, gọn và dễ vận hành.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <AuthMetric label="Realtime" value="Live comments" />
              <AuthMetric label="Orders" value="Ops workflow" />
              <AuthMetric label="Customers" value="Retention" />
            </div>

            <div className="mt-auto hidden pt-10 lg:block">
              <div className="grid gap-3 rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur-xl sm:grid-cols-3">
                <SpotlightItem label="Focus" value="Tốc độ xử lý" />
                <SpotlightItem label="Theme" value="Light / Dark" />
                <SpotlightItem label="Layout" value="Responsive" />
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center bg-[linear-gradient(180deg,_var(--surface-strong)_0%,_var(--surface)_100%)] px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="mx-auto w-full max-w-md">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
                Welcome back
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                Sign in to your workspace
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--foreground-soft)]">
                Dùng tài khoản của bạn để truy cập dashboard và dữ liệu vận hành.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="flex flex-col gap-2.5">
                <span className="text-sm font-medium text-[var(--muted)]">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  required
                  className="h-14 rounded-[20px] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary-soft)]"
                />
              </label>

              <label className="flex flex-col gap-2.5">
                <span className="text-sm font-medium text-[var(--muted)]">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-14 rounded-[20px] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[color:var(--primary-soft)]"
                />
              </label>

              {loginError ? (
                <div className="rounded-[20px] border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-300">
                  {loginError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isLoggingIn}
                className="inline-flex h-14 w-full items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,_var(--primary)_0%,_var(--primary-strong)_100%)] text-sm font-semibold text-white shadow-[0_24px_60px_rgba(10,132,255,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingIn ? "Signing in..." : "Sign in"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function AuthMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/16 bg-white/10 px-4 py-4 backdrop-blur-xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function SpotlightItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/62">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
