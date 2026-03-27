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
  fetchInstagramConnectionStatus,
  INSTAGRAM_OAUTH_BACKEND_ORIGIN,
  isInstagramOAuthMessagePayload,
  openCenteredPopup,
  primeInstagramPopup,
  requestInstagramAuthUrl,
  type InstagramConnectionStatus,
} from "@/lib/instagram-oauth";
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

      if (event.origin !== INSTAGRAM_OAUTH_BACKEND_ORIGIN) {
        return;
      }

      if (event.source !== popup) {
        return;
      }

      if (!isInstagramOAuthMessagePayload(event.data)) {
        return;
      }

      const expectedState = expectedStateRef.current;
      if (
        expectedState &&
        event.data.state &&
        event.data.state !== expectedState
      ) {
        return;
      }

      if (event.data.ok) {
        await finishAuthentication({
          kind: "success",
          message: event.data.message || AUTH_SUCCESS_MESSAGE,
        });
        return;
      }

      await finishAuthentication({
        kind: "error",
        message: event.data.message || AUTH_ERROR_MESSAGE,
      });
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

    try {
      const result = await requestInstagramAuthUrl(session, {
        clientOrigin: window.location.origin,
      });
      applyAuthResponses([result.response], patchSession, logout);

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

      expectedStateRef.current = result.state;
      popup.location.replace(result.authUrl);
      popup.focus();
    } catch (requestError) {
      await finishAuthentication({
        kind: "error",
        message:
          requestError instanceof Error
            ? requestError.message
            : AUTH_ERROR_MESSAGE,
      });
    }
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
