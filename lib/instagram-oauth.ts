import {
  asRecord,
  extractApiData,
  pickBoolean,
  pickString,
} from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export const INSTAGRAM_OAUTH_BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_INSTAGRAM_OAUTH_BACKEND_ORIGIN ??
  "https://livetracker-ulz2.onrender.com";
export const INSTAGRAM_OAUTH_START_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_OAUTH_START_URL ??
  `${INSTAGRAM_OAUTH_BACKEND_ORIGIN}/api/instagram/auth/start`;
export const INSTAGRAM_CONNECTION_STATUS_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_CONNECTION_STATUS_URL ??
  `${INSTAGRAM_OAUTH_BACKEND_ORIGIN}/api/v1/instagram-auth/status`;
export const INSTAGRAM_AUTH_POPUP_NAME = "livetracker_instagram_oauth";
export const INSTAGRAM_AUTH_SUCCESS_TYPE = "INSTAGRAM_AUTH_SUCCESS";
export const INSTAGRAM_AUTH_ERROR_TYPE = "INSTAGRAM_AUTH_ERROR";

export type InstagramOAuthSuccessMessage = {
  type: typeof INSTAGRAM_AUTH_SUCCESS_TYPE;
  ok: true;
  state?: string;
  message?: string;
  instagramUserId?: string;
  username?: string;
};

export type InstagramOAuthErrorMessage = {
  type: typeof INSTAGRAM_AUTH_ERROR_TYPE;
  ok: false;
  state?: string;
  message?: string;
  code?: string;
};

export type InstagramOAuthMessagePayload =
  | InstagramOAuthSuccessMessage
  | InstagramOAuthErrorMessage;

export type InstagramAuthStartResult = {
  authUrl: string;
  state: string;
  raw: unknown;
  response: Response;
};

export type InstagramConnectionStatus = {
  isConnected: boolean;
  status: string;
  instagramUserId: string;
  username: string;
  displayName: string;
  message: string;
  connectedAt: string;
  raw: unknown;
};

export type InstagramConnectionStatusResult = {
  status: InstagramConnectionStatus;
  response: Response;
};

type PopupOptions = {
  width?: number;
  height?: number;
};

const CONNECTED_STATUS_VALUES = new Set([
  "connected",
  "active",
  "authorized",
  "success",
]);

export async function requestInstagramAuthUrl(
  session: SessionSettings,
  options?: {
    clientOrigin?: string;
  },
): Promise<InstagramAuthStartResult> {
  const response = await fetch(INSTAGRAM_OAUTH_START_URL, {
    method: "POST",
    headers: createAuthHeaders(session, {
      "content-type": "application/json",
    }),
    body: JSON.stringify({
      source: "web",
      platform: "web",
      clientOrigin: options?.clientOrigin ?? "",
    }),
    cache: "no-store",
  });

  const payload = await parseResponsePayload(response);
  const data = asRecord(extractApiData(payload) ?? payload);
  const authUrl =
    pickString(data, ["authUrl", "authorizeUrl", "url", "redirectUrl"]) ||
    pickString(payload, ["authUrl", "authorizeUrl", "url", "redirectUrl"]);

  if (!response.ok || !authUrl) {
    throw new Error(
      extractErrorMessage(
        payload,
        "Không lấy được Instagram auth URL từ backend.",
      ),
    );
  }

  return {
    authUrl,
    state:
      pickString(data, ["state"]) ||
      pickString(payload, ["state"]) ||
      getStateFromAuthUrl(authUrl),
    raw: payload,
    response,
  };
}

export async function fetchInstagramConnectionStatus(
  session: SessionSettings,
): Promise<InstagramConnectionStatusResult> {
  const response = await fetch(INSTAGRAM_CONNECTION_STATUS_URL, {
    method: "GET",
    headers: createAuthHeaders(session),
    cache: "no-store",
  });

  const payload = await parseResponsePayload(response);
  const data = asRecord(extractApiData(payload) ?? payload);
  const statusText = pickString(data, [
    "status",
    "type",
    "connectionStatus",
  ]).toLowerCase();
  const inferredConnection =
    pickBoolean(data, ["connected", "isConnected", "ok"]) ??
    (statusText ? CONNECTED_STATUS_VALUES.has(statusText) : null);
  const instagramUserId =
    pickString(data, ["instagramUserId", "userId", "id"]) ||
    pickString(payload, ["instagramUserId", "userId", "id"]);
  const username =
    pickString(data, ["instagramUsername", "username", "handle"]) ||
    pickString(payload, ["instagramUsername", "username", "handle"]);
  const displayName =
    pickString(data, ["displayName", "name", "shopName", "username"]) ||
    pickString(payload, ["displayName", "name", "shopName", "username"]);
  const isConnected =
    inferredConnection ?? Boolean(instagramUserId || username || displayName);

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(payload, "Không lấy được trạng thái Instagram."),
    );
  }

  return {
    status: {
      isConnected,
      status: statusText || (isConnected ? "connected" : "disconnected"),
      instagramUserId,
      username,
      displayName,
      message:
        pickString(data, ["message", "description"]) ||
        pickString(payload, ["message", "description"]) ||
        (isConnected
          ? "Instagram account is connected."
          : "Instagram account is not connected."),
      connectedAt:
        pickString(data, ["connectedAt", "updatedAt", "createdAt"]) ||
        pickString(payload, ["connectedAt", "updatedAt", "createdAt"]),
      raw: payload,
    },
    response,
  };
}

export function isInstagramOAuthMessagePayload(
  value: unknown,
): value is InstagramOAuthMessagePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  const type = record.type;
  const ok = record.ok;

  if (type === INSTAGRAM_AUTH_SUCCESS_TYPE) {
    return ok === true;
  }

  if (type === INSTAGRAM_AUTH_ERROR_TYPE) {
    return ok === false;
  }

  return false;
}

export function openCenteredPopup(
  url = "about:blank",
  name = INSTAGRAM_AUTH_POPUP_NAME,
  options?: PopupOptions,
) {
  if (typeof window === "undefined") {
    return null;
  }

  const width = options?.width ?? 540;
  const height = options?.height ?? 720;
  const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
  const viewportWidth =
    window.innerWidth ??
    document.documentElement.clientWidth ??
    window.screen.width;
  const viewportHeight =
    window.innerHeight ??
    document.documentElement.clientHeight ??
    window.screen.height;
  const left = Math.max(0, dualScreenLeft + (viewportWidth - width) / 2);
  const top = Math.max(0, dualScreenTop + (viewportHeight - height) / 2);

  const popup = window.open(
    url,
    name,
    [
      "popup=yes",
      "toolbar=no",
      "menubar=no",
      "location=yes",
      "status=no",
      "scrollbars=yes",
      "resizable=yes",
      `width=${Math.round(width)}`,
      `height=${Math.round(height)}`,
      `left=${Math.round(left)}`,
      `top=${Math.round(top)}`,
    ].join(","),
  );

  popup?.focus();
  return popup;
}

export function primeInstagramPopup(popup: Window) {
  try {
    popup.document.title = "Instagram authentication";
    popup.document.body.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #0f172a;">
        <h1 style="margin: 0 0 12px; font-size: 20px;">Connecting Instagram</h1>
        <p style="margin: 0; line-height: 1.6;">Redirecting you to Instagram authentication...</p>
      </div>
    `;
  } catch {
    // Ignore popup rendering issues. The navigation still works.
  }
}

function createAuthHeaders(
  session: SessionSettings,
  extraHeaders?: Record<string, string>,
) {
  const headers = new Headers(extraHeaders);

  if (session.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
    headers.set("x-access-token", session.accessToken);
  }

  if (session.refreshToken) {
    headers.set("x-refresh-token", session.refreshToken);
  }

  return headers;
}

async function parseResponsePayload(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as Record<string, unknown>;
  }

  return {
    message: await response.text(),
  };
}

function extractErrorMessage(payload: unknown, fallback: string) {
  const data = asRecord(extractApiData(payload) ?? payload);

  return (
    pickString(data, ["message", "error", "detail", "error_description"]) ||
    pickString(payload, ["message", "error", "detail", "error_description"]) ||
    fallback
  );
}

function getStateFromAuthUrl(authUrl: string) {
  try {
    return new URL(authUrl).searchParams.get("state") ?? "";
  } catch {
    return "";
  }
}
