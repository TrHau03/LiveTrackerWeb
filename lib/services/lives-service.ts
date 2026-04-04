/**
 * Lives Service — Fetch lives list, detail, detect, SSE stream.
 */
import { proxyRequest, streamProxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export async function fetchMyLives(
  session: SessionSettings,
  query?: { page?: number; limit?: number; search?: string },
) {
  return proxyRequest(session, {
    path: "/lives/my-lives",
    query: {
      page: query?.page ?? 1,
      limit: query?.limit ?? 50,
      search: query?.search || undefined,
    },
  });
}

export async function fetchLiveDetail(session: SessionSettings, liveId: string) {
  return proxyRequest(session, { path: `/lives/${liveId}` });
}

export async function fetchLiveComments(
  session: SessionSettings,
  liveId: string,
  query?: { limit?: number; direction?: "next" | "prev"; cursor?: string },
) {
  return proxyRequest(session, {
    path: `/comments/live/${liveId}/cursor`,
    query: {
      limit: query?.limit ?? 50,
      direction: query?.direction ?? "next",
      cursor: query?.cursor || undefined,
    },
  });
}

export async function fetchLiveDetailAndComments(
  session: SessionSettings,
  liveId: string,
) {
  const [liveResponse, commentsResponse] = await Promise.all([
    fetchLiveDetail(session, liveId),
    fetchLiveComments(session, liveId, { limit: 20, direction: "next" }),
  ]);

  return {
    liveResponse,
    commentsResponse,
    responses: [liveResponse.response, commentsResponse.response],
  };
}

export function streamLiveComments(
  session: SessionSettings,
  liveId: string,
  onEvent: (event: { event: string; data: string }) => void,
  signal: AbortSignal,
) {
  return streamProxyRequest(
    session,
    { path: `/comments/live/${liveId}/stream` },
    onEvent,
    signal,
  );
}
