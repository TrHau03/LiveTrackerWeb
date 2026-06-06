/**
 * Tags Service — Fetch, create, update, delete tags.
 */
import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export interface CreateTagDto {
  label: string;
  color?: string;
}

export interface UpdateTagDto {
  label?: string;
  color?: string;
}

export async function fetchMyTags(
  session: SessionSettings,
  query?: { page?: number; limit?: number },
) {
  return proxyRequest(session, {
    path: "/tags/user/my-tags",
    query: {
      page: query?.page ?? 1,
      limit: query?.limit ?? 50,
    },
  });
}

export async function createTag(
  session: SessionSettings,
  body: CreateTagDto,
) {
  return proxyRequest(session, {
    path: "/tags",
    method: "POST",
    body,
  });
}

export async function updateTag(
  session: SessionSettings,
  tagId: string,
  body: UpdateTagDto,
) {
  return proxyRequest(session, {
    path: `/tags/${tagId}`,
    method: "PATCH",
    body,
  });
}

export async function deleteTag(
  session: SessionSettings,
  tagId: string,
) {
  return proxyRequest(session, {
    path: `/tags/${tagId}`,
    method: "DELETE",
  });
}
