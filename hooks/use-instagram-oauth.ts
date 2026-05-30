"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { applyAuthResponses } from "@/lib/auth-response";
import {
  OAUTH_STATE_STORAGE_KEY,
  getInstagramOAuthConfig,
  isInstagramLinkResultMessage,
} from "@/lib/instagram-auth";
import {
  fetchInstagramConnectionStatus,
  openCenteredPopup,
  primeInstagramPopup,
  requestInstagramAuthUrl,
  type InstagramConnectionStatus,
} from "@/lib/instagram-oauth";
import { proxyRequest, extractCollection } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

type UseInstagramOAuthOptions = {
  session: SessionSettings;
  patchSession: (patch: Partial<SessionSettings>) => void;
  logout: () => Promise<void>;
  onAuthSuccess?: (connection: InstagramConnectionStatus | null) => void | Promise<void>;
};

type ConnectionRequestState = "idle" | "loading" | "ready" | "error";

type FinishAuthParams = {
  kind: "success" | "error" | "cancelled";
  message: string;
};

type UseInstagramOAuthResult = {
  startInstagramAuth: () => Promise<void>;
  refreshConnectionStatus: () => Promise<InstagramConnectionStatus | null>;
  connectionState: ConnectionRequestState;
  connectionStatus: InstagramConnectionStatus | null;
  connectionError: string;
  isLoading: boolean;
  error: string;
  notice: string;
  clearFeedback: () => void;
};

const POPUP_CLOSED_POLL_INTERVAL_MS = 500;
const REFRESH_AFTER_SUCCESS_DELAY_MS = 900;
const POPUP_BLOCKED_MESSAGE =
  "Popup Instagram bị trình duyệt chặn. Hãy cho phép popup và thử lại.";
const AUTH_CANCELLED_MESSAGE = "Authentication was cancelled.";
const AUTH_SUCCESS_MESSAGE = "Instagram connected successfully.";
const AUTH_ERROR_MESSAGE = "Instagram authentication failed.";

export function useInstagramOAuth({
  session,
  patchSession,
  logout,
  onAuthSuccess,
}: UseInstagramOAuthOptions): UseInstagramOAuthResult {
  const isMountedRef = useRef(true);
  const popupRef = useRef<Window | null>(null);
  const popupPollRef = useRef<number | null>(null);
  const expectedStateRef = useRef("");
  const finishedRef = useRef(false);

  const [connectionState, setConnectionState] =
    useState<ConnectionRequestState>("idle");
  const [connectionStatus, setConnectionStatus] =
    useState<InstagramConnectionStatus | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const clearPopupTracking = useCallback((closePopup: boolean) => {
    if (popupPollRef.current !== null) {
      window.clearInterval(popupPollRef.current);
      popupPollRef.current = null;
    }

    const popup = popupRef.current;
    popupRef.current = null;
    expectedStateRef.current = "";

    if (closePopup && popup && !popup.closed) {
      try {
        popup.close();
      } catch {
        // Ignore cross-window close errors.
      }
    }
  }, []);

  const readConnectionStatus = useCallback(async () => {
    if (!session.accessToken) {
      if (!isMountedRef.current) {
        return null;
      }

      startTransition(() => {
        setConnectionState("ready");
        setConnectionStatus(null);
        setConnectionError("");
      });
      return null;
    }

    if (isMountedRef.current) {
      startTransition(() => {
        setConnectionState("loading");
        setConnectionError("");
      });
    }

    try {
      const result = await fetchInstagramConnectionStatus(session);
      applyAuthResponses([result.response], patchSession, logout);

      try {
        const shopsResult = await proxyRequest<any>(session, {
          path: "/users/me/shops",
          method: "GET",
        });
        if (shopsResult.ok) {
          const shopsList = extractCollection(shopsResult.data);
          if (session.user) {
            patchSession({
              user: {
                ...session.user,
                shops: shopsList as any,
              },
            });
          }
        }
      } catch (shopError) {
        console.error("Failed to reload user shops:", shopError);
      }

      if (!isMountedRef.current) {
        return result.status;
      }

      startTransition(() => {
        setConnectionState("ready");
        setConnectionStatus(result.status);
        setConnectionError("");
      });

      return result.status;
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Không thể tải trạng thái kết nối Instagram.";

      if (!isMountedRef.current) {
        return null;
      }

      startTransition(() => {
        setConnectionState("error");
        setConnectionError(message);
      });

      return null;
    }
  }, [logout, patchSession, session]);

  const refreshConnectionAfterSuccess = useCallback(async () => {
    let status = await readConnectionStatus();

    if (status?.isConnected) {
      return status;
    }

    await delay(REFRESH_AFTER_SUCCESS_DELAY_MS);
    status = await readConnectionStatus();
    return status;
  }, [readConnectionStatus]);

  const finishAuthentication = useCallback(
    async ({ kind, message }: FinishAuthParams) => {
      if (finishedRef.current) {
        return;
      }

      finishedRef.current = true;
      clearPopupTracking(true);

      if (isMountedRef.current) {
        startTransition(() => {
          setIsLoading(false);
        });
      }

      if (kind === "success") {
        if (isMountedRef.current) {
          startTransition(() => {
            setError("");
            setNotice(message || AUTH_SUCCESS_MESSAGE);
          });
        }

        const status = await refreshConnectionAfterSuccess();
        await onAuthSuccess?.(status);
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      if (kind === "cancelled") {
        startTransition(() => {
          setError("");
          setNotice(message);
        });
        return;
      }

      startTransition(() => {
        setError(message);
        setNotice("");
      });
    },
    [clearPopupTracking, onAuthSuccess, refreshConnectionAfterSuccess],
  );

  const handleMessage = useCallback(
    async (event: MessageEvent) => {
      const popup = popupRef.current;
      if (!popup || finishedRef.current) {
        return;
      }

      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.source !== popup) {
        return;
      }

      if (!isInstagramLinkResultMessage(event.data)) {
        return;
      }

      if (event.data.ok) {
        await finishAuthentication({
          kind: "success",
          message: event.data.message || AUTH_SUCCESS_MESSAGE,
        });
      } else {
        await finishAuthentication({
          kind: "error",
          message: event.data.message || AUTH_ERROR_MESSAGE,
        });
      }
    },
    [finishAuthentication],
  );

  useEffect(() => {
    if (!session.accessToken) {
      startTransition(() => {
        setConnectionState("ready");
        setConnectionStatus(null);
        setConnectionError("");
      });
      return;
    }

    void readConnectionStatus();
  }, [readConnectionStatus, session.accessToken, session.refreshToken]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const listener = (event: MessageEvent) => {
      void handleMessage(event);
    };

    window.addEventListener("message", listener);
    return () => {
      window.removeEventListener("message", listener);
    };
  }, [handleMessage, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const popup = popupRef.current;
      if (!popup || finishedRef.current) {
        return;
      }

      if (popup.closed) {
        void finishAuthentication({
          kind: "cancelled",
          message: AUTH_CANCELLED_MESSAGE,
        });
      }
    }, POPUP_CLOSED_POLL_INTERVAL_MS);

    popupPollRef.current = intervalId;

    return () => {
      window.clearInterval(intervalId);
      if (popupPollRef.current === intervalId) {
        popupPollRef.current = null;
      }
    };
  }, [finishAuthentication, isLoading]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      finishedRef.current = true;
      clearPopupTracking(true);
    };
  }, [clearPopupTracking]);

  async function startInstagramAuth() {
    if (isLoading) {
      return;
    }

    const popup = openCenteredPopup();
    if (!popup) {
      startTransition(() => {
        setError(POPUP_BLOCKED_MESSAGE);
        setNotice("");
      });
      return;
    }

    primeInstagramPopup(popup);
    popupRef.current = popup;
    expectedStateRef.current = "";
    finishedRef.current = false;

    startTransition(() => {
      setIsLoading(true);
      setError("");
      setNotice("Opening Instagram authentication...");
    });

    // Luôn luôn tự sinh Auth URL ở client để đảm bảo redirect_uri khớp 100% với Web app cấu hình trong Meta Console
    const config = getInstagramOAuthConfig();
    const state = JSON.stringify({
      source: "web",
      nonce: typeof window !== "undefined" && window.crypto?.randomUUID 
        ? window.crypto.randomUUID() 
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    });
    
    const localUrl = new URL(config.authUrl);
    localUrl.searchParams.set("client_id", config.clientId);
    localUrl.searchParams.set("redirect_uri", config.redirectUri);
    localUrl.searchParams.set("response_type", config.responseType);
    localUrl.searchParams.set("scope", config.scopes.join(","));
    localUrl.searchParams.set("state", state);
    const authUrl = localUrl.toString();

    if (finishedRef.current || popupRef.current !== popup) {
      return;
    }

    if (popup.closed) {
      await finishAuthentication({
        kind: "cancelled",
        message: AUTH_CANCELLED_MESSAGE,
      });
      return;
    }

    window.localStorage.setItem(OAUTH_STATE_STORAGE_KEY, state);
    expectedStateRef.current = state;
    
    popup.location.replace(authUrl);
    popup.focus();
  }

  function clearFeedback() {
    startTransition(() => {
      setError("");
      setNotice("");
    });
  }

  async function refreshConnectionStatus() {
    return readConnectionStatus();
  }

  return {
    startInstagramAuth,
    refreshConnectionStatus,
    connectionState,
    connectionStatus,
    connectionError,
    isLoading,
    error,
    notice,
    clearFeedback,
  };
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
