"use client";

import { useSession } from "@/components/session-provider";
import { useInstagramOAuth } from "@/hooks/use-instagram-oauth";
import { INSTAGRAM_OAUTH_BACKEND_ORIGIN } from "@/lib/instagram-oauth";
import { formatDateTime } from "@/lib/proxy-client";

const PRIMARY_BUTTON_CLASS =
  "inline-flex h-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,_var(--primary)_0%,_var(--primary-strong)_100%)] px-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(20,71,230,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY_BUTTON_CLASS =
  "inline-flex h-12 items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:-translate-y-0.5 hover:border-[color:var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60";

export function InstagramLinkPanel() {
  const { logout, patchSession, session } = useSession();
  const {
    startInstagramAuth,
    refreshConnectionStatus,
    connectionState,
    connectionStatus,
    connectionError,
    isLoading,
    error,
    notice,
    clearFeedback,
  } = useInstagramOAuth({
    session,
    patchSession,
    logout,
  });

  const isConnected = Boolean(connectionStatus?.isConnected);
  const statusLabel =
    connectionState === "loading" && !connectionStatus
      ? "Checking"
      : isConnected
        ? "Connected"
        : "Not connected";
  const statusTone = isConnected
    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
    : "bg-[var(--surface-muted)] text-[var(--muted)]";

  async function handleRefresh() {
    clearFeedback();
    await refreshConnectionStatus();
  }

  return (
    <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:px-6 md:py-6 lg:px-7 lg:py-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Instagram OAuth
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            Connect Instagram without leaving the app
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--foreground-soft)]">
            Nút connect sẽ mở popup mới, backend callback dùng `window.opener.postMessage(...)`
            để báo kết quả về tab hiện tại, sau đó frontend refetch trạng thái kết nối.
          </p>
        </div>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusTone}`}
        >
          {statusLabel}
        </span>
      </div>

      {notice ? <Feedback tone="neutral" message={notice} /> : null}
      {error ? <Feedback tone="error" message={error} /> : null}
      {connectionError && !error ? (
        <Feedback tone="error" message={connectionError} />
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(140deg,_rgba(20,71,230,0.12)_0%,_var(--surface-strong)_65%)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Current connection
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            {isConnected
              ? connectionStatus?.displayName ||
                connectionStatus?.username ||
                "Instagram connected"
              : "Ready to authenticate"}
          </h3>
          <p className="mt-2 text-sm leading-7 text-[var(--foreground-soft)]">
            {connectionStatus?.message ||
              "User stays on app.livetracker.vn, OAuth runs in a popup, and the UI updates when the popup posts back."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoTile
              label="Username"
              value={
                connectionStatus?.username
                  ? `@${connectionStatus.username}`
                  : "Not available"
              }
            />
            <InfoTile
              label="Instagram User ID"
              value={connectionStatus?.instagramUserId || "Not available"}
            />
            <InfoTile
              label="Connected at"
              value={formatDateTime(connectionStatus?.connectedAt)}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Runtime safeguards
          </p>
          <div className="mt-3 space-y-3">
            <SecurityRow
              title="Trusted callback origin"
              value={INSTAGRAM_OAUTH_BACKEND_ORIGIN}
            />
            <SecurityRow
              title="Popup lifecycle"
              value="Button disabled while auth is in progress and popup close is polled every 500ms."
            />
            <SecurityRow
              title="Refresh strategy"
              value="Status is refetched immediately after success and retried once for eventual consistency."
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void startInstagramAuth()}
          disabled={isLoading}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isLoading
            ? "Authenticating..."
            : isConnected
              ? "Reconnect Instagram"
              : "Auth with Instagram"}
        </button>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={isLoading || connectionState === "loading"}
          className={SECONDARY_BUTTON_CLASS}
        >
          {connectionState === "loading" ? "Refreshing..." : "Refresh status"}
        </button>
      </div>

      <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-sm leading-7 text-[var(--foreground-soft)]">
        Nếu các màn khác trong app cũng phụ thuộc vào trạng thái Instagram, hãy gọi refetch ở đây hoặc
        reload trang sau khi popup báo success. Hook hiện tại đã refetch `/instagram-auth/status` để cập nhật UI panel này.
      </div>
    </section>
  );
}

function Feedback({
  tone,
  message,
}: {
  tone: "neutral" | "error";
  message: string;
}) {
  return (
    <div
      aria-live="polite"
      className={`mt-6 rounded-[20px] px-4 py-3 text-sm ${
        tone === "error"
          ? "border border-[rgba(255,69,58,0.24)] bg-[rgba(255,69,58,0.08)] text-[rgb(255,69,58)]"
          : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-soft)]"
      }`}
    >
      {message}
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-7 text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function SecurityRow({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
        {title}
      </p>
      <p className="mt-2 break-all text-sm leading-7 text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
