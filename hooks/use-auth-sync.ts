/**
 * Auth sync helper — Extracted from workspace-screens to be reusable across hooks.
 * Handles token refresh and 401 auto-logout.
 *
 * This function:
 * 1. Checks response headers for x-refreshed-access-token (auto-refresh from backend)
 * 2. Updates session if new token received
 * 3. Auto-logout on 401 status
 */
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
