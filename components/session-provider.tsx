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
  type SessionSettings,
} from "@/lib/workspace-session";

type SessionContextValue = {
  isReady: boolean;
  session: SessionSettings;
  setSession: (value: SessionSettings) => void;
  patchSession: (patch: Partial<SessionSettings>) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionSettings>(DEFAULT_SESSION);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const applySession = () => {
      const nextSession = parseStoredSession(
        window.localStorage.getItem(SESSION_STORAGE_KEY),
      );

      startTransition(() => {
        setSession(nextSession);
        setIsReady(true);
      });
    };

    applySession();

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_STORAGE_KEY) {
        return;
      }

      applySession();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [isReady, session]);

  const value = useMemo<SessionContextValue>(
    () => ({
      isReady,
      session,
      setSession,
      patchSession: (patch) => {
        setSession((current) => ({
          ...current,
          ...patch,
        }));
      },
    }),
    [isReady, session],
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

