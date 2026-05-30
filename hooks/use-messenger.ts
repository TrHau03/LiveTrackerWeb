"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/session-provider";
import * as messengerService from "@/lib/services/messenger-service";
import type { Conversation, Message, WindowStatus } from "@/types";

const CONVERSATIONS_KEY = "messenger-conversations";
const MESSAGES_KEY = "messenger-messages";

// ─── useConversations ────────────────────────────────────────────────────────

export function useConversations(search?: string) {
  const { session } = useSession();
  const limit = 20;

  return useInfiniteQuery({
    queryKey: [CONVERSATIONS_KEY, search],
    queryFn: async ({ pageParam = 1 }) => {
      const result = await messengerService.getConversations(session, {
        page: pageParam,
        limit,
        search,
      });
      return {
        items: result.items || [],
        nextPage:
          (result.items?.length || 0) === limit ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!session.accessToken,
    retry: 2,
  });
}

// ─── useMessages ─────────────────────────────────────────────────────────────

export function useMessages(conversationId: string | null) {
  const { session } = useSession();
  const limit = 20;

  return useInfiniteQuery({
    queryKey: [MESSAGES_KEY, conversationId],
    queryFn: async ({ pageParam }) => {
      const result = await messengerService.getMessages(
        session,
        conversationId!,
        { cursor: pageParam || undefined, limit },
      );
      return result;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined,
    enabled: !!session.accessToken && !!conversationId,
    retry: 2,
  });
}

// ─── useSendMessage ──────────────────────────────────────────────────────────

export function useSendMessage(conversationId: string) {
  const { session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { text: string; useHumanAgentTag?: boolean }) =>
      messengerService.sendMessage(
        session,
        conversationId,
        params.text,
        params.useHumanAgentTag,
      ),
    onMutate: async (params) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: [MESSAGES_KEY, conversationId],
      });

      // Snapshot previous state
      const previousMessages = queryClient.getQueryData([
        MESSAGES_KEY,
        conversationId,
      ]);

      // Optimistic update — add sending message
      const optimisticMessage: Message = {
        _id: `temp_${Date.now()}`,
        igMessageId: `local_${Date.now()}`,
        conversationId,
        senderId: "me",
        text: params.text,
        sentAt: new Date().toISOString(),
        status: "sending",
        fromShop: true,
        messageType: "text",
      };

      queryClient.setQueryData(
        [MESSAGES_KEY, conversationId],
        (old: any) => {
          if (!old) return old;
          const newPages = [...old.pages];
          if (newPages.length > 0) {
            newPages[0] = {
              ...newPages[0],
              items: [...newPages[0].items, optimisticMessage],
            };
          }
          return { ...old, pages: newPages };
        },
      );

      return { previousMessages };
    },
    onError: (_err, _params, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          [MESSAGES_KEY, conversationId],
          context.previousMessages,
        );
      }
    },
    onSuccess: (sentMessage) => {
      // Replace optimistic message with real one
      queryClient.setQueryData(
        [MESSAGES_KEY, conversationId],
        (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: any) => ({
            ...page,
            items: page.items.map((msg: Message) =>
              msg._id.startsWith("temp_") && msg.text === sentMessage.text
                ? sentMessage
                : msg,
            ),
          }));
          return { ...old, pages: newPages };
        },
      );

      // Also update conversation list
      queryClient.invalidateQueries({
        queryKey: [CONVERSATIONS_KEY],
      });
    },
  });
}

// ─── useMarkAsRead ───────────────────────────────────────────────────────────

export function useMarkAsRead() {
  const { session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      messengerService.markAsRead(session, conversationId),
    onSuccess: (_data, conversationId) => {
      // Update unreadCount in conversation list
      queryClient.setQueryData([CONVERSATIONS_KEY], (old: any) => {
        if (!old?.pages) return old;
        const newPages = old.pages.map((page: any) => ({
          ...page,
          items: page.items.map((conv: Conversation) =>
            conv._id === conversationId
              ? { ...conv, unreadCount: 0 }
              : conv,
          ),
        }));
        return { ...old, pages: newPages };
      });
    },
  });
}

// ─── useSyncConversations ────────────────────────────────────────────────────

export function useSyncConversations() {
  const { session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) =>
      messengerService.syncConversations(session, shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [CONVERSATIONS_KEY],
      });
    },
  });
}

// ─── useSyncMessages ─────────────────────────────────────────────────────────

export function useSyncMessages(conversationId: string) {
  const { session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shopId: string) =>
      messengerService.syncMessages(session, conversationId, shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [MESSAGES_KEY, conversationId],
      });
    },
  });
}

// ─── useMessengerSSE ─────────────────────────────────────────────────────────

export function useMessengerSSE() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (!session.accessToken || eventSourceRef.current) return;

    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      "https://admin.livetracker.vn/api/v1";
    const url = `${baseUrl}/messenger/stream?token=${session.accessToken}`;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "connected":
              setIsConnected(true);
              break;

            case "new_message":
              queryClient.invalidateQueries({
                queryKey: [CONVERSATIONS_KEY],
              });
              if (data.data?.conversationId) {
                queryClient.invalidateQueries({
                  queryKey: [MESSAGES_KEY, data.data.conversationId],
                });
              }
              break;

            case "message_status_updated":
              if (data.data?.messageId) {
                queryClient.invalidateQueries({
                  queryKey: [MESSAGES_KEY],
                });
              }
              break;

            case "conversation_updated":
              queryClient.invalidateQueries({
                queryKey: [CONVERSATIONS_KEY],
              });
              break;

            case "ping":
              // Heartbeat — no action needed
              break;
          }
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        // EventSource auto-reconnects
      };
    } catch {
      setIsConnected(false);
    }
  }, [session.accessToken, queryClient]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, connect, disconnect };
}

// ─── getWindowStatus ─────────────────────────────────────────────────────────

export function getWindowStatus(
  lastCustomerMessageAt?: string,
  allMessages?: Message[],
): WindowStatus {
  let lastCustomerTime = lastCustomerMessageAt;

  if (!lastCustomerTime && allMessages) {
    const lastCustomerMsg = [...allMessages]
      .reverse()
      .find((m) => !m.fromShop);
    if (!lastCustomerMsg) return "closed";
    lastCustomerTime = lastCustomerMsg.sentAt;
  }

  if (!lastCustomerTime) return "closed";

  const hours =
    (Date.now() - new Date(lastCustomerTime).getTime()) / (1000 * 60 * 60);
  if (hours <= 24) return "open";
  if (hours <= 168) return "human_agent";
  return "closed";
}
