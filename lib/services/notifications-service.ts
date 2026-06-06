/**
 * Notifications Service — Fetch, read, delete notifications.
 */
import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export interface QueryNotificationDto {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
}

export async function fetchMyNotifications(
  session: SessionSettings,
  query?: QueryNotificationDto,
) {
  return proxyRequest(session, {
    path: "/notifications",
    query: {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      isRead: query?.isRead !== undefined ? String(query.isRead) : undefined,
      type: query?.type || undefined,
    },
  });
}

export async function markNotificationAsRead(
  session: SessionSettings,
  notificationId: string,
) {
  return proxyRequest(session, {
    path: `/notifications/${notificationId}/read`,
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(
  session: SessionSettings,
) {
  return proxyRequest(session, {
    path: "/notifications/read-all",
    method: "PATCH",
  });
}

export async function deleteNotification(
  session: SessionSettings,
  notificationId: string,
) {
  return proxyRequest(session, {
    path: `/notifications/${notificationId}`,
    method: "DELETE",
  });
}
