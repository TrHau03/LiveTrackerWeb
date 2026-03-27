"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { useSession } from "@/components/session-provider";
import { applyAuthResponses } from "@/lib/auth-response";
import {
  closeInstagramPopupSoon,
  consumeInstagramOAuthState,
  createInstagramShop,
  exchangeInstagramCode,
  fetchInstagramConnectionSnapshot,
  fetchInstagramProfile,
  findExistingInstagramShop,
  getInstagramOAuthConfig,
  parseInstagramCallbackPayload,
  sendInstagramLinkResult,
} from "@/lib/instagram-auth";
import { asRecord, pickString } from "@/lib/proxy-client";

type CallbackState = {
  status: "working" | "success" | "error";
  message: string;
};

const SECONDARY_BUTTON_CLASS =
  "inline-flex h-12 items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:-translate-y-0.5 hover:border-[color:var(--primary-soft)]";

export function InstagramAuthCallbackScreen() {
  const searchParams = useSearchParams();
  const { logout, patchSession, session } = useSession();
  const [state, setState] = useState<CallbackState>({
    status: "working",
    message: "Đang xử lý Instagram login…",
  });
  const [hashValue, setHashValue] = useState<string | null>(null);
  const hasRunRef = useRef(false);

  const oauthConfig = useMemo(() => getInstagramOAuthConfig(), []);

  useEffect(() => {
    setHashValue(window.location.hash);
  }, []);

  const callbackPayload = useMemo(
    () => parseInstagramCallbackPayload(searchParams, hashValue ?? ""),
    [hashValue, searchParams],
  );

  useEffect(() => {
    let active = true;

    async function run() {
      if (hashValue === null) {
        return;
      }

      if (hasRunRef.current) {
        return;
      }

      hasRunRef.current = true;

      if (callbackPayload.error) {
        finish(false, callbackPayload.error);
        return;
      }

      if (
        callbackPayload.state &&
        !consumeInstagramOAuthState(callbackPayload.state)
      ) {
        finish(false, "OAuth state không hợp lệ. Hãy thử login với Instagram lại.");
        return;
      }

      if (!callbackPayload.code) {
        finish(
          false,
          "Callback không có `code`. Hãy kiểm tra lại cấu hình Instagram OAuth redirect.",
        );
        return;
      }

      try {
        const tokenResult = await exchangeInstagramCode(
          callbackPayload.code,
          oauthConfig.redirectUri,
        );
        const profile = await fetchInstagramProfile(tokenResult.accessToken);
        if (!profile.id && !profile.username) {
          throw new Error("Không lấy được profile Instagram hợp lệ.");
        }

        const snapshot = await fetchInstagramConnectionSnapshot(session);
        applyAuthResponses(snapshot.responses, patchSession, logout);

        const existingShop = findExistingInstagramShop(snapshot.shops, profile);
        if (existingShop) {
          if (!active) {
            return;
          }

          finish(
            true,
            "Instagram account đã tồn tại trong workspace. Tab đăng nhập sẽ tự đóng.",
          );
          return;
        }

        const createShop = await createInstagramShop(session, profile);
        applyAuthResponses([createShop.response], patchSession, logout);

        if (!createShop.ok) {
          throw new Error(
            getResponseMessage(createShop.data, "Không thể thêm shop từ Instagram."),
          );
        }

        if (!active) {
          return;
        }

        finish(
          true,
          `Đã thêm shop ${
            profile.name || profile.username || "Instagram"
          } vào workspace. Tab đăng nhập sẽ tự đóng.`,
        );
      } catch (error) {
        if (!active) {
          return;
        }

        finish(
          false,
          error instanceof Error
            ? error.message
            : "Không thể hoàn tất Instagram login.",
        );
      }
    }

    function finish(ok: boolean, message: string) {
      setState({
        status: ok ? "success" : "error",
        message,
      });

      sendInstagramLinkResult({
        type: "livetracker:instagram-link",
        ok,
        message,
      });

      if (window.opener && !window.opener.closed) {
        closeInstagramPopupSoon();
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [callbackPayload, hashValue, logout, oauthConfig.redirectUri, patchSession, session]);

  return (
    <div className="space-y-8 pb-28 lg:pb-6">
      <section className="overflow-hidden rounded-[36px] border border-[var(--border)] bg-[linear-gradient(140deg,_rgba(10,132,255,0.14)_0%,_rgba(90,200,250,0.08)_36%,_var(--surface-strong)_100%)] px-6 py-7 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:px-8 md:py-8 lg:px-9 lg:py-9">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--muted)]">
          Instagram Callback
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.05em] text-[var(--foreground)] md:text-5xl">
          {state.status === "success"
            ? "Instagram shop added"
            : state.status === "error"
              ? "Instagram login failed"
              : "Completing Instagram login"}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-[var(--foreground-soft)] md:text-base">
          {state.message}
        </p>
      </section>

      <section className="rounded-[32px] border border-[var(--border)] bg-[var(--surface)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur-2xl md:px-6 md:py-6 lg:px-7 lg:py-7">
        <div className="grid gap-4 md:grid-cols-3">
          <StepCard
            label="1"
            title="Receive code"
            description="Popup callback ở route `/ul` đọc `code` mà Instagram trả về sau OAuth."
          />
          <StepCard
            label="2"
            title="Exchange token"
            description="Popup gọi server route để đổi `code` thành short-lived token an toàn."
          />
          <StepCard
            label="3"
            title="Notify and close"
            description="Popup thêm shop, báo kết quả về tab chính rồi tự đóng."
          />
        </div>

        <div className="mt-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4 text-sm text-[var(--foreground-soft)]">
          Redirect URI hiện tại: <span className="font-semibold text-[var(--foreground)]">{oauthConfig.redirectUri}</span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className={SECONDARY_BUTTON_CLASS}>
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={() => window.close()}
            className={SECONDARY_BUTTON_CLASS}
          >
            Close tab
          </button>
        </div>
      </section>
    </div>
  );
}

function StepCard({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(10,132,255,0.14)] text-sm font-semibold text-[var(--primary)]">
        {label}
      </span>
      <h2 className="mt-4 text-lg font-semibold text-[var(--foreground)]">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-7 text-[var(--foreground-soft)]">
        {description}
      </p>
    </article>
  );
}

function getResponseMessage(payload: unknown, fallback: string) {
  const record = asRecord(payload);
  return pickString(record, ["message"]) || fallback;
}
