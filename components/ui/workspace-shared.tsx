"use client";

import React from "react";
import Link from "next/link";
import { asRecord, pickNumber, pickString } from "@/lib/proxy-client";

type Primitive = string | number | boolean | null | undefined;
export const SECONDARY_BUTTON_CLASS =
  "inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--hover)] disabled:opacity-50";

export function Hero({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <section className="mb-6 flex flex-col gap-1">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] md:text-2xl">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-[var(--muted)]">
          {description}
        </p>
      )}
    </section>
  );
}

export function Panel({
  title,
  children,
  action,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const hasHeader = !!(title || action);
  return (
    <section className={`rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)] ${className}`}>
      {hasHeader && (
        <div className="border-b border-[var(--border)] px-5 py-3.5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {title && (
              <h2 className="text-sm font-semibold text-[var(--foreground)]">
                {title}
              </h2>
            )}
            <div className={!title ? "w-full md:w-auto flex justify-start" : ""}>
              {action}
            </div>
          </div>
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PanelInset({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
      <div className="border-b border-[var(--border)] px-5 py-3.5">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  change,
  extra,
}: {
  label: string;
  value: Primitive;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  change?: number | null;
  extra?: string | null;
}) {
  return (
    <article className="flex items-center gap-4 rounded-lg bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)] transition-shadow duration-200 hover:shadow-[var(--shadow-strong)] border border-[var(--border)]">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--muted)] truncate mb-0.5">{label}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-lg font-bold tracking-tight text-[var(--foreground)]">
            {typeof value === "number" ? formatNumber(value) : String(value)}
          </h3>
          {change !== undefined && change !== null && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${change >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
              {change >= 0 ? "+" : ""}{change}%
            </span>
          )}
        </div>
        {extra && <p className="text-[10px] text-[var(--muted)] mt-0.5 font-medium">{extra}</p>}
      </div>
    </article>
  );
}

export function HeartIcon() {
  return <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.5 3c1.557 0 3.046.727 4 2.015Q12.454 3 14.5 3c2.786 0 5.25 2.322 5.25 5.25 0 3.924-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>;
}

export function HomeIcon() {
  return <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" /><path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" /></svg>;
}

export function BagIcon() {
  return <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" /></svg>;
}

export function BriefcaseIcon() {
  return <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M7.5 5.25a3 3 0 013-3h3a3 3 0 013 3v.25h1.75c1.105 0 2 .895 2 2v2.25h-15V7.5c0-1.105.895-2 2-2H7.5v-.25zm-4.5 6v6.75a3 3 0 003 3h12a3 3 0 003-3v-6.75h-18zM10.5 9v1.5a.75.75 0 001.5 0V9h-1.5z" clipRule="evenodd" /></svg>;
}

export function MiniMetric({ label, value }: { label: string; value: Primitive }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">
        {String(value)}
      </p>
    </div>
  );
}

export function Tag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "blue" | "muted" | "danger" | "green" | "orange";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    muted: "bg-[var(--surface-muted)] text-[var(--muted)]",
    danger: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones}`}>
      {children}
    </span>
  );
}

export function LinkPill({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={SECONDARY_BUTTON_CLASS}
    >
      {label}
    </Link>
  );
}

export function LoadingState({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] ${compact ? "px-4 py-3 text-sm" : "mb-4 px-4 py-4 text-sm"}`}>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--primary)]" />
        Loading...
      </div>
    </div>
  );
}

export function ErrorState({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 text-red-600 dark:border-red-800/30 dark:bg-red-900/10 dark:text-red-400 ${compact ? "px-4 py-3 text-sm" : "mb-4 px-4 py-4 text-sm"}`}>
      {message}
    </div>
  );
}

export function EmptyState({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted)] ${compact ? "px-4 py-3 text-sm" : "px-4 py-4 text-sm"}`}>
      {message}
    </div>
  );
}

export function CompanionMetric({
  label,
  value,
}: {
  label: string;
  value: Primitive;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1.5 text-sm font-semibold text-[var(--foreground)]">{String(value)}</p>
    </div>
  );
}

export function compactMetric(value: unknown) {
  const record = asRecord(value);
  const primary =
    pickNumber(record, [
      "total",
      "count",
      "value",
      "totalOrders",
      "totalComments",
      "totalLives",
      "totalCustomers",
    ]) ?? 0;

  return { primary };
}

export function safelyParseEvent(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function dedupeComments(comments: Record<string, unknown>[]) {
  const seen = new Set<string>();
  return comments.filter((comment, index) => {
    const key =
      pickString(comment, ["id", "_id"]) ||
      `${pickString(comment, ["createdAt"])}-${pickString(comment, ["text"])}-${index}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function compactAddress(value: unknown) {
  const record = asRecord(value);
  return [
    pickString(record, ["street"]),
    pickString(record, ["ward"]),
    pickString(record, ["province"]),
  ]
    .filter(Boolean)
    .join(", ");
}

export function normalizeInstagramHandle(value: string) {
  return value.trim().replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "");
}

export function resolveInstagramHandle(
  live: Record<string, unknown>,
  shop: Record<string, unknown>,
  user: Record<string, unknown>,
) {
  const handle = [
    pickString(live, ["igUsername", "instagramUsername", "username"]),
    pickString(shop, ["igUsername", "instagramUsername", "username"]),
    pickString(user, ["igUsername", "instagramUsername", "username"]),
  ].find(Boolean);

  return normalizeInstagramHandle(handle ?? "");
}

export function buildInstagramUrl(handle: string) {
  if (!handle) {
    return "https://www.instagram.com/";
  }

  return `https://www.instagram.com/${handle}/`;
}

export function compactDate(value: string) {
  if (!value) {
    return "No data";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatStreamState(value: "connecting" | "live" | "stopped" | "error") {
  return {
    connecting: "Connecting",
    live: "Live",
    stopped: "Stopped",
    error: "Error",
  }[value];
}

export const CONTROL_CLASS =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/30";
export const PRIMARY_BUTTON_CLASS =
  "inline-flex h-9 items-center justify-center rounded-lg bg-[var(--accent-green)] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--accent-green-strong)] disabled:opacity-50";

export function formatDateTime(value: string | undefined | null) {
  if (!value) return "No data";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

export function formatLiveDateTime(value: string | undefined | null) {
  if (!value) return "Live - No data";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Live - No data";
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `Live - ${day}/${month}/${year}, ${hours}:${minutes}`;
  } catch {
    return `Live - ${String(value)}`;
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}
