"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_SESSION,
  parseStoredSession,
  SESSION_STORAGE_KEY,
  type AuthUser,
  type SessionSettings,
} from "@/lib/workspace-session";

type LoginPayload = {
  email: string;
  password: string;
};

type SessionContextValue = {
  authStatus: "booting" | "signed_out" | "signed_in";
  isReady: boolean;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  loginError: string;
  session: SessionSettings;
  login: (payload: LoginPayload) => Promise<boolean>;
  logout: () => Promise<void>;
  patchSession: (patch: Partial<SessionSettings>) => void;
  refreshUser: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionSettings>(DEFAULT_SESSION);
  const [isReady, setIsReady] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const nextSession = parseStoredSession(
      window.localStorage.getItem(SESSION_STORAGE_KEY),
    );

    startTransition(() => {
      setSession(nextSession);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [isReady, session]);

  useEffect(() => {
    if (!isReady || !session.accessToken || session.user) {
      return;
    }

    const controller = new AbortController();

    fetchUserProfile(
      {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      },
      controller.signal,
    )
      .then((result) => {
        if (!result.user) {
          return;
        }

        startTransition(() => {
          setSession((current) => ({
            ...current,
            accessToken: result.accessToken ?? current.accessToken,
            user: result.user,
          }));
        });
      })
      .catch(() => {
        // Ignore hydration failure and let screens surface API errors if needed.
      });

    return () => controller.abort();
  }, [isReady, session.accessToken, session.refreshToken, session.user]);

  const value = useMemo<SessionContextValue>(
    () => ({
      authStatus: !isReady
        ? "booting"
        : session.accessToken
          ? "signed_in"
          : "signed_out",
      isReady,
      isAuthenticated: Boolean(session.accessToken),
      isLoggingIn,
      loginError,
      session,
      login: async ({ email, password }) => {
        setIsLoggingIn(true);
        setLoginError("");

        try {
          const loginResponse = await fetch("/api/proxy/api/auth/login", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ email, password }),
            cache: "no-store",
          });

          const loginPayload = (await loginResponse.json()) as {
            message?: string;
            data?: {
              tokens?: {
                accessToken?: string;
                refreshToken?: string;
              };
            };
          };

          const accessToken = loginPayload.data?.tokens?.accessToken ?? "";
          const refreshToken = loginPayload.data?.tokens?.refreshToken ?? "";

          if (!loginResponse.ok || !accessToken || !refreshToken) {
            setLoginError(loginPayload.message || "Đăng nhập thất bại.");
            return false;
          }

          const profile = await fetchUserProfile(
            {
              accessToken,
              refreshToken,
            },
            undefined,
          );

          startTransition(() => {
            setSession({
              accessToken: profile.accessToken ?? accessToken,
              refreshToken,
              user: profile.user,
            });
          });

          return true;
        } catch (error) {
          setLoginError(
            error instanceof Error ? error.message : "Đăng nhập thất bại.",
          );
          return false;
        } finally {
          setIsLoggingIn(false);
        }
      },
      logout: async () => {
        const refreshToken = session.refreshToken;

        startTransition(() => {
          setSession(DEFAULT_SESSION);
          setLoginError("");
        });

        if (!refreshToken) {
          return;
        }

        try {
          await fetch("/api/proxy/api/auth/logout", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ refreshToken }),
            cache: "no-store",
          });
        } catch {
          // Best-effort logout.
        }
      },
      patchSession: (patch) => {
        setSession((current) => ({
          ...current,
          ...patch,
        }));
      },
      refreshUser: async () => {
        if (!session.accessToken) {
          return;
        }

        const profile = await fetchUserProfile({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });

        if (!profile.user) {
          return;
        }

        startTransition(() => {
          setSession((current) => ({
            ...current,
            accessToken: profile.accessToken ?? current.accessToken,
            user: profile.user,
          }));
        });
      },
    }),
    [
      isLoggingIn,
      isReady,
      loginError,
      session,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider.");
  }

  return context;
}

async function fetchUserProfile(
  auth: {
    accessToken: string;
    refreshToken: string;
  },
  signal?: AbortSignal,
): Promise<{
  accessToken?: string;
  user: AuthUser | null;
}> {
  const response = await fetch("/api/proxy/api/users/me", {
    method: "GET",
    headers: {
      "x-access-token": auth.accessToken,
      "x-refresh-token": auth.refreshToken,
    },
    cache: "no-store",
    signal,
  });

  const payload = (await response.json()) as {
    data?: Record<string, unknown>;
  };

  if (!response.ok || !payload.data) {
    return {
      user: null,
    };
  }

  const record = payload.data;
  const refreshedAccessToken = response.headers.get("x-refreshed-access-token");

  return {
    accessToken: refreshedAccessToken ?? undefined,
    user: {
      id: pickString(record, ["id", "_id"]),
      fullName: pickString(record, ["fullName", "username", "email"]) || "User",
      email: pickString(record, ["email"]),
      role: pickString(record, ["role"]) || "user",
      avatar: pickString(record, ["avatar"]),
    },
  };
}

function pickString(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return "";
}
