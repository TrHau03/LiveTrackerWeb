/**
 * Comments Service — Fetch comments list.
 */
import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export async function fetchMyComments(
  session: SessionSettings,
  query?: { page?: number; limit?: number; sort?: string },
) {
  return proxyRequest(session, {
    path: "/comments/user/my-comments",
    query: {
      page: query?.page ?? 1,
      limit: query?.limit ?? 50,
      sort: query?.sort ?? "-createdAt",
    },
  });
}

export async function fetchCommentDetail(
  session: SessionSettings,
  commentId: string,
) {
  return proxyRequest(session, { path: `/comments/${commentId}` });
}

export async function updateComment(
  session: SessionSettings,
  commentId: string,
  body: Record<string, unknown>,
) {
  return proxyRequest(session, {
    path: `/comments/${commentId}`,
    method: "PATCH",
    body,
  });
}

export async function deleteComment(
  session: SessionSettings,
  commentId: string,
) {
  return proxyRequest(session, {
    path: `/comments/${commentId}`,
    method: "DELETE",
  });
}
