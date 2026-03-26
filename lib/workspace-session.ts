export type SessionSettings = {
  baseUrl: string;
  accessToken: string;
  refreshToken: string;
  adminToken: string;
};

export const SESSION_STORAGE_KEY = "live-tracker-web.integration-session";

export const DEFAULT_SESSION: SessionSettings = {
  baseUrl: "http://localhost:3000",
  accessToken: "",
  refreshToken: "",
  adminToken: "",
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

