import {
  asRecord,
  extractCollection,
  pickString,
  proxyRequest,
} from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

const OAUTH_STATE_STORAGE_KEY = "live-tracker-web.instagram-oauth-state";
const OAUTH_STATE_LAST_OK_STORAGE_KEY =
  "live-tracker-web.instagram-oauth-state-ok";
export const INSTAGRAM_LINK_MESSAGE_TYPE = "livetracker:instagram-link";
export const INSTAGRAM_APP_ID = "1494270874967671";
export const INSTAGRAM_AUTHORIZE_URL =
  "https://api.instagram.com/oauth/authorize";
export const INSTAGRAM_REDIRECT_URL = "https://livetracker-ulz2.onrender.com/ul";
export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_messages",
  "instagram_business_manage_comments",
] as const;
export const INSTAGRAM_RESPONSE_TYPE = "code";
export const INSTAGRAM_PROFILE_URL = "https://graph.instagram.com/me";
export const INSTAGRAM_PROFILE_FIELDS = "id,username";

export type InstagramOAuthConfig = {
  authUrl: string;
  clientId: string;
  redirectUri: string;
  callbackPath: string;
  responseType: string;
  scopes: string[];
  profileUrl: string;
  profileFields: string;
};

export type InstagramProfile = {
  id: string;
  username: string;
  name: string;
  avatar: string;
};

export type InstagramLinkResultMessage = {
  type: typeof INSTAGRAM_LINK_MESSAGE_TYPE;
  ok: boolean;
  message: string;
};

export type InstagramConnectionSnapshot = {
  shopsPayload: unknown;
  shops: Record<string, unknown>[];
  connectedShop: Record<string, unknown> | null;
  responses: Response[];
};

type SearchParamReader = {
  get: (name: string) => string | null;
};

export function getInstagramOAuthConfig(): InstagramOAuthConfig {
  return {
    authUrl: INSTAGRAM_AUTHORIZE_URL,
    clientId: INSTAGRAM_APP_ID,
    redirectUri: INSTAGRAM_REDIRECT_URL,
    callbackPath: "/ul",
    responseType: INSTAGRAM_RESPONSE_TYPE,
    scopes: [...INSTAGRAM_SCOPES],
    profileUrl: INSTAGRAM_PROFILE_URL,
    profileFields: INSTAGRAM_PROFILE_FIELDS,
  };
}

export function isInstagramOAuthConfigured() {
  return true;
}

export function startInstagramOAuth() {
  const config = getInstagramOAuthConfig();
  const state = JSON.stringify({
    source: "web",
    nonce: createNonce(),
  });
  window.localStorage.setItem(OAUTH_STATE_STORAGE_KEY, state);
  window.localStorage.removeItem(OAUTH_STATE_LAST_OK_STORAGE_KEY);
  const popup = window.open(
    buildInstagramLoginUrl(
      config,
      state,
    ),
    "livetracker_instagram_login",
    "popup=yes,width=540,height=720,menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes",
  );

  if (!popup) {
    return false;
  }

  popup.focus();
  return true;
}

export function sendInstagramLinkResult(message: InstagramLinkResultMessage) {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(message, "*");
  }

  try {
    window.localStorage.setItem(
      INSTAGRAM_LINK_MESSAGE_TYPE,
      JSON.stringify({
        ...message,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Ignore storage sync errors.
  }
}

export function isInstagramLinkResultMessage(
  value: unknown,
): value is InstagramLinkResultMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.type === INSTAGRAM_LINK_MESSAGE_TYPE &&
    typeof record.ok === "boolean" &&
    typeof record.message === "string"
  );
}

export function closeInstagramPopupSoon(delay = 700) {
  window.setTimeout(() => {
    window.close();
  }, delay);
}

export function readInstagramLinkResultFromStorage(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return isInstagramLinkResultMessage(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function consumeInstagramOAuthState(receivedState: string) {
  const storedState = window.localStorage.getItem(OAUTH_STATE_STORAGE_KEY) ?? "";
  const lastOkState =
    window.localStorage.getItem(OAUTH_STATE_LAST_OK_STORAGE_KEY) ?? "";
  window.localStorage.removeItem(OAUTH_STATE_STORAGE_KEY);

  if (lastOkState && lastOkState === receivedState) {
    return true;
  }

  if (!storedState || !receivedState) {
    return true;
  }

  const isValid = storedState === receivedState;

  if (isValid) {
    window.localStorage.setItem(OAUTH_STATE_LAST_OK_STORAGE_KEY, receivedState);
  }

  return isValid;
}

export function parseInstagramCallbackPayload(
  searchParams: SearchParamReader,
  hash: string,
) {
  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));

  return {
    error:
      searchParams.get("error_description") ||
      searchParams.get("error_message") ||
      searchParams.get("message") ||
      searchParams.get("error") ||
      hashParams.get("error_description") ||
      hashParams.get("error_message") ||
      hashParams.get("error") ||
      "",
    state:
      searchParams.get("state") ||
      hashParams.get("state") ||
      "",
    code:
      searchParams.get("code") ||
      hashParams.get("code") ||
      "",
  };
}

export async function exchangeInstagramCode(
  code: string,
  redirectUri: string,
): Promise<{
  accessToken: string;
  userId: string;
}> {
  const response = await fetch("/api/instagram/exchange-code", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      code,
      redirectUri,
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as {
    success?: boolean;
    message?: string;
    data?: {
      accessToken?: string;
      userId?: string;
    };
  };

  if (!response.ok || !payload.data?.accessToken) {
    throw new Error(payload.message || "Không thể đổi code lấy short-lived token.");
  }

  return {
    accessToken: payload.data.accessToken,
    userId: payload.data.userId ?? "",
  };
}

export async function fetchInstagramProfile(accessToken: string) {
  const config = getInstagramOAuthConfig();
  const url = new URL(config.profileUrl);
  url.searchParams.set("fields", config.profileFields);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    const error = asRecord(payload.error);
    throw new Error(
      pickString(error, ["message"]) ||
        pickString(payload, ["message"]) ||
        "Không thể lấy profile Instagram.",
    );
  }

  const record = asRecord(payload);

  return {
    id: pickString(record, ["id", "user_id"]),
    username: pickString(record, ["username"]),
    name:
      pickString(record, ["username"]) ||
      pickString(record, ["id"]),
    avatar: "",
  } satisfies InstagramProfile;
}

export async function fetchInstagramConnectionSnapshot(
  session: SessionSettings,
): Promise<InstagramConnectionSnapshot> {
  const shopsResult = await proxyRequest(session, { path: "/users/me/shops" });
  const shops = extractCollection(shopsResult.data);

  return {
    shopsPayload: shopsResult.data,
    shops,
    connectedShop: shops[0] ?? null,
    responses: [shopsResult.response],
  };
}

export function findExistingInstagramShop(
  shops: Record<string, unknown>[],
  profile: InstagramProfile,
) {
  return (
    shops.find((shop) => {
      const shopId = pickString(shop, ["id"]);
      const shopName = pickString(shop, ["name"]);

      return (
        Boolean(profile.id && shopId && shopId === profile.id) ||
        Boolean(profile.username && shopName && shopName === profile.username) ||
        Boolean(profile.name && shopName && shopName === profile.name)
      );
    }) ?? null
  );
}

export function createInstagramShop(
  session: SessionSettings,
  profile: InstagramProfile,
) {
  return proxyRequest(session, {
    path: "/users/me/shops",
    method: "POST",
    body: {
      shop: {
        id: profile.id || undefined,
        name: profile.name || profile.username || "Instagram shop",
        avatar: profile.avatar || undefined,
      },
    },
  });
}

function buildInstagramLoginUrl(
  config: InstagramOAuthConfig,
  state: string,
) {
  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", config.responseType);
  url.searchParams.set("scope", config.scopes.join(","));
  url.searchParams.set("state", state);
  return url.toString();
}

function createNonce() {
  if (typeof window !== "undefined" && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
