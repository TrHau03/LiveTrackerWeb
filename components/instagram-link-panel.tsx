"use client";

import { useEffect, useMemo, useState } from "react";

import { useSession } from "@/components/session-provider";
import { applyAuthResponses } from "@/lib/auth-response";
import {
  fetchInstagramConnectionSnapshot,
  getInstagramOAuthConfig,
  INSTAGRAM_LINK_MESSAGE_TYPE,
  isInstagramLinkResultMessage,
  readInstagramLinkResultFromStorage,
  startInstagramOAuth,
  type InstagramConnectionSnapshot,
} from "@/lib/instagram-auth";
import { pickString } from "@/lib/proxy-client";

type PanelState = {
  status: "loading" | "ready" | "error";
  snapshot: InstagramConnectionSnapshot | null;
  error: string;
};

const PRIMARY_BUTTON_CLASS =
  "inline-flex h-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,_var(--primary)_0%,_var(--primary-strong)_100%)] px-4 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(10,132,255,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY_BUTTON_CLASS =
  "inline-flex h-12 items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:-translate-y-0.5 hover:border-[color:var(--primary-soft)] disabled:cursor-not-allowed disabled:opacity-60";

export function InstagramLinkPanel() {
  const { logout, patchSession, session } = useSession();
  const [panelState, setPanelState] = useState<PanelState>({
    status: "loading",
    snapshot: null,
    error: "",
  });
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"neutral" | "error">(
    "neutral",
  );

  const oauthConfig = useMemo(() => getInstagramOAuthConfig(), []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const snapshot = await fetchInstagramConnectionSnapshot(session);
        applyAuthResponses(snapshot.responses, patchSession, logout);

        if (!active) {
          return;
        }

        setPanelState({
          status: "ready",
          snapshot,
          error: "",
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setPanelState({
          status: "error",
          snapshot: null,
          error:
            error instanceof Error
              ? error.message
              : "Unable to load Instagram shops.",
        });
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [logout, patchSession, session]);

  useEffect(() => {
    async function handleResult(ok: boolean, message: string) {
      setFeedbackTone(ok ? "neutral" : "error");
      setFeedback(message);

      if (!ok) {
        return;
      }

      try {
        const snapshot = await fetchInstagramConnectionSnapshot(session);
        applyAuthResponses(snapshot.responses, patchSession, logout);
        setPanelState({
          status: "ready",
          snapshot,
          error: "",
        });
      } catch (error) {
        setPanelState({
          status: "error",
          snapshot: null,
          error:
            error instanceof Error
              ? error.message
              : "Unable to refresh Instagram shops.",
        });
      }
    }

    function onMessage(event: MessageEvent) {
      if (!isInstagramLinkResultMessage(event.data)) {
        return;
      }

      void handleResult(event.data.ok, event.data.message);
    }

    function onStorage(event: StorageEvent) {
      if (event.key !== INSTAGRAM_LINK_MESSAGE_TYPE) {
        return;
      }

      const payload = readInstagramLinkResultFromStorage(event.newValue);
      if (!payload) {
        return;
      }

      void handleResult(payload.ok, payload.message);
    }

    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, [logout, patchSession, session]);

  async function handleRefresh() {
    setFeedback("");

    try {
      const snapshot = await fetchInstagramConnectionSnapshot(session);
      applyAuthResponses(snapshot.responses, patchSession, logout);

      setPanelState({
        status: "ready",
        snapshot,
        error: "",
      });
    } catch (error) {
      setPanelState({
        status: "error",
        snapshot: null,
        error:
          error instanceof Error
            ? error.message
            : "Unable to refresh Instagram shops.",
      });
    }
  }

  function handleStartInstagramLogin() {
    setFeedbackTone("neutral");
    setFeedback("Đang mở tab đăng nhập Instagram…");

    const started = startInstagramOAuth();
    if (!started) {
      setFeedbackTone("error");
      setFeedback("Không thể khởi chạy login với Instagram.");
    }
  }

  const shops = panelState.snapshot?.shops ?? [];

  return (
    <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:px-6 md:py-6 lg:px-7 lg:py-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Instagram
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            Login and add shop
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--foreground-soft)]">
            User đăng nhập Instagram, callback quay về web app, sau đó FE lấy profile và gọi `POST /users/me/shops`.
          </p>
        </div>

        <span
          className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
            shops.length > 0
              ? "bg-[rgba(10,132,255,0.14)] text-[var(--primary)]"
              : "bg-[var(--surface-muted)] text-[var(--muted)]"
          }`}
        >
          {shops.length > 0 ? `${shops.length} linked` : "No linked shop"}
        </span>
      </div>

      {panelState.status === "loading" ? (
        <div className="mt-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 text-sm text-[var(--muted)]">
          Loading current shops…
        </div>
      ) : null}

      {panelState.status === "error" ? (
        <div className="mt-5 rounded-[24px] border border-[rgba(255,69,58,0.24)] bg-[rgba(255,69,58,0.08)] px-4 py-4 text-sm text-[rgb(255,69,58)]">
          {panelState.error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[28px] border border-[var(--border)] bg-[linear-gradient(140deg,_rgba(10,132,255,0.12)_0%,_var(--surface-strong)_65%)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            OAuth config
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            Ready to connect
          </h3>
          <p className="mt-2 text-sm leading-7 text-[var(--foreground-soft)]">
            Flow web dùng cùng App ID theo doc mobile, nhưng xử lý callback và add shop ở web app.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <InfoTile
              label="App ID"
              value={oauthConfig.clientId}
            />
            <InfoTile
              label="Response type"
              value={oauthConfig.responseType}
            />
            <InfoTile
              label="Scopes"
              value={`${oauthConfig.scopes.length} scopes`}
            />
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--surface-strong)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Redirect URI
          </p>
          <p className="mt-3 break-all rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--foreground)]">
            {oauthConfig.redirectUri}
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--foreground-soft)]">
            Instagram trả `code` về URI này. Backend `/ul` sẽ trả popup về web route `/ul` để app xử lý và tự đóng tab.
          </p>
        </div>
      </div>

      {feedback ? (
        <div
          className={`mt-6 rounded-[20px] px-4 py-3 text-sm ${
            feedbackTone === "error"
              ? "border border-[rgba(255,69,58,0.24)] bg-[rgba(255,69,58,0.08)] text-[rgb(255,69,58)]"
              : "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground-soft)]"
          }`}
        >
          {feedback}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleStartInstagramLogin}
          className={PRIMARY_BUTTON_CLASS}
        >
          Login with Instagram
        </button>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          className={SECONDARY_BUTTON_CLASS}
        >
          Refresh shops
        </button>
      </div>

      <div className="mt-6 grid gap-3">
        {shops.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-sm text-[var(--muted)]">
            Chưa có shop nào được liên kết.
          </div>
        ) : (
          shops.slice(0, 4).map((shop, index) => (
            <article
              key={`${pickString(shop, ["_id", "id", "name"]) || index}`}
              className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                    {pickString(shop, ["name"]) || "Instagram shop"}
                  </p>
                  <p className="mt-1 truncate text-xs text-[var(--muted)]">
                    {pickString(shop, ["id"]) || pickString(shop, ["_id"]) || "No shop id"}
                  </p>
                </div>
                <span className="rounded-full bg-[rgba(10,132,255,0.14)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                  Linked
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
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
