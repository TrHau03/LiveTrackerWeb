export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatar?: string;
};

export type SessionSettings = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser | null;
};

export const SESSION_STORAGE_KEY = "live-tracker-web.auth-session";

export const DEFAULT_SESSION: SessionSettings = {
  accessToken: "",
  refreshToken: "",
  user: null,
};

export function parseStoredSession(source: string | null): SessionSettings {
  if (!source) {
    return DEFAULT_SESSION;
  }

  try {
    return {
      ...DEFAULT_SESSION,
      ...(JSON.parse(source) as Partial<SessionSettings>),
    };
  } catch {
    return DEFAULT_SESSION;
  }
}
