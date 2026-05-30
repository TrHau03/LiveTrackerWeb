"use client";

import { proxyRequest, extractApiData } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";
import type {
  Conversation,
  ConversationListParams,
  Message,
  MessageListParams,
} from "@/types";

// ─── Response shapes ─────────────────────────────────────────────────────────

type ConversationsPage = {
  items: Conversation[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type MessagesPage = {
  items: Message[];
  pagination: { nextCursor: string | null; hasMore: boolean };
};

type SyncResult = { synced: number; total: number };

// ─── API functions ───────────────────────────────────────────────────────────

/**
 * Fetch conversations list (page-based)
 */
export async function getConversations(
  session: SessionSettings,
  params: ConversationListParams,
): Promise<ConversationsPage> {
  const result = await proxyRequest<{ data: ConversationsPage }>(session, {
    path: "/messenger/conversations",
    method: "GET",
    query: {
      page: params.page,
      limit: params.limit,
      search: params.search,
    },
  });

  const data = extractApiData<ConversationsPage>(result.data);
  return data ?? { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
}

/**
 * Fetch messages for a conversation (cursor-based)
 */
export async function getMessages(
  session: SessionSettings,
  conversationId: string,
  params: MessageListParams,
): Promise<MessagesPage> {
  const result = await proxyRequest<{ data: MessagesPage }>(session, {
    path: `/messenger/conversations/${conversationId}/messages`,
    method: "GET",
    query: {
      cursor: params.cursor,
      limit: params.limit,
    },
  });

  const data = extractApiData<MessagesPage>(result.data);
  return data ?? { items: [], pagination: { nextCursor: null, hasMore: false } };
}

/**
 * Send a message to a conversation
 */
export async function sendMessage(
  session: SessionSettings,
  conversationId: string,
  text: string,
  useHumanAgentTag?: boolean,
): Promise<Message> {
  const result = await proxyRequest<{ data: Message }>(session, {
    path: `/messenger/conversations/${conversationId}/send`,
    method: "POST",
    body: {
      text,
      ...(useHumanAgentTag && { useHumanAgentTag: true }),
    },
  });

  const data = extractApiData<Message>(result.data);
  if (!data) {
    throw new Error("Failed to send message");
  }

  return data;
}

/**
 * Mark a conversation as read
 */
export async function markAsRead(
  session: SessionSettings,
  conversationId: string,
): Promise<void> {
  await proxyRequest(session, {
    path: `/messenger/conversations/${conversationId}/read`,
    method: "PATCH",
  });
}

/**
 * Sync conversations from Instagram
 */
export async function syncConversations(
  session: SessionSettings,
  shopId: string,
): Promise<SyncResult> {
  const result = await proxyRequest<{ data: SyncResult }>(session, {
    path: "/messenger/sync",
    method: "POST",
    body: { shopId },
  });

  const data = extractApiData<SyncResult>(result.data);
  return data ?? { synced: 0, total: 0 };
}

/**
 * Sync old messages for a conversation from Instagram
 */
export async function syncMessages(
  session: SessionSettings,
  conversationId: string,
  shopId: string,
): Promise<SyncResult> {
  const result = await proxyRequest<{ data: SyncResult }>(session, {
    path: `/messenger/sync/${conversationId}/messages`,
    method: "POST",
    body: { shopId },
  });

  const data = extractApiData<SyncResult>(result.data);
  return data ?? { synced: 0, total: 0 };
}
