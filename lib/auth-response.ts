import type { SessionSettings } from "@/lib/workspace-session";

export function applyAuthResponses(
  responses: Response[],
  patchSession: (patch: Partial<SessionSettings>) => void,
  logout: () => Promise<void>,
) {
  const refreshedAccessToken = responses
    .map((response) => response.headers.get("x-refreshed-access-token"))
    .find(Boolean);

  if (refreshedAccessToken) {
    patchSession({
      accessToken: refreshedAccessToken,
    });
  }

  if (responses.some((response) => response.status === 401)) {
    void logout();
  }
}
