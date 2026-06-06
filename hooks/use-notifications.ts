/**
 * useNotifications — React Query hooks for managing system notifications.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { 
  fetchMyNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  deleteNotification,
  QueryNotificationDto
} from "@/lib/services/notifications-service";

export function useNotifications(query?: QueryNotificationDto) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["notifications", session.user?.id, query?.page, query?.limit, query?.isRead, query?.type],
    queryFn: async () => {
      const response = await fetchMyNotifications(session, query);
      applyAuthResponses([response.response], patchSession, logout);
      return response.data;
    },
    enabled: !!session.accessToken,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await markNotificationAsRead(session, notificationId);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Could not mark notification as read");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async () => {
      const response = await markAllNotificationsAsRead(session);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Could not mark all notifications as read");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const queryClient = useQueryClient();
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await deleteNotification(session, notificationId);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Could not delete notification");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
