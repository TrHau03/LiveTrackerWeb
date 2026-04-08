/**
 * useComments — Hook cho SSE comment stream + initial comment load.
 * Hỗ trợ parse tất cả SSE events: new_comment, live_stats_updated,
 * customer_closed_count_updated, customer_status_updated.
 */
import { startTransition, useEffect, useRef, useState, useCallback } from "react";

import { useSession } from "@/components/session-provider";
import { fetchLiveComments, fetchLiveDetail, streamLiveComments } from "@/lib/services/lives-service";
import { extractCollection, asRecord, pickString, extractApiData, pickNumber, pickBoolean } from "@/lib/proxy-client";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

type StreamState = "connecting" | "live" | "stopped" | "error";

export type LiveStats = {
  totalOrder: number;
  totalComment: number;
  totalItems: number;
};

function safelyParseEvent(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function dedupeComments(comments: Record<string, unknown>[]) {
  const seen = new Set<string>();
  return comments.filter((comment, index) => {
    const key =
      pickString(comment, ["id", "_id"]) ||
      `${pickString(comment, ["createdAt"])}-${pickString(comment, ["text"])}-${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useCommentsStream(liveId: string | null) {
  const { logout, patchSession, session } = useSession();
  const [comments, setComments] = useState<Record<string, unknown>[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("connecting");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [liveStats, setLiveStats] = useState<LiveStats>({ totalOrder: 0, totalComment: 0, totalItems: 0 });
  const abortRef = useRef<AbortController | null>(null);

  // Initial comment load
  useEffect(() => {
    if (!liveId) {
      setComments([]);
      setLiveStats({ totalOrder: 0, totalComment: 0, totalItems: 0 });
      return;
    }
    
    // Reset state for new liveId
    setComments([]);
    setNextCursor(null);
    setHasMore(false);
    setLiveStats({ totalOrder: 0, totalComment: 0, totalItems: 0 });
    
    let cancelled = false;

    async function load() {
      try {
        const [response, liveResponse] = await Promise.all([
          fetchLiveComments(session, liveId!, {
            limit: 50,
            direction: "next",
          }),
          fetchLiveDetail(session, liveId!)
        ]);
        if (cancelled) return;
        applyAuthResponses([response.response, liveResponse.response], patchSession, logout);
        if (liveResponse.data) {
          const liveData = asRecord(extractApiData(liveResponse.data));
          setLiveStats({
            totalComment: pickNumber(liveData, ["totalComment", "totalComments"]) ?? 0,
            totalOrder: pickNumber(liveData, ["totalOrder", "totalOrders"]) ?? 0,
            totalItems: pickNumber(liveData, ["totalItem", "totalItems"]) ?? 0,
          });
        }
        if (response.data) {
          const items = extractCollection(response.data);
          
          // Helper to sort by time ascending (oldest first)
          const sortByTimeAsc = (arr: Record<string, unknown>[]) => 
            [...arr].sort((a, b) => {
              const ta = new Date(pickString(a, ["createdAt", "created_at"]) || 0).getTime();
              const tb = new Date(pickString(b, ["createdAt", "created_at"]) || 0).getTime();
              return ta - tb;
            });
            
          setComments(sortByTimeAsc(items));
          
          // Robust cursor extraction using extractApiData first
          const payload = extractApiData<any>(response.data);
          const meta = asRecord(payload?.pagination || payload?.meta || payload || response.data);
          const cursor = pickString(meta, ["nextCursor", "cursor", "next_cursor", "next", "next_page_cursor"]);
          
          setNextCursor(cursor || null);
          setHasMore(!!cursor);
        }
      } catch (error) {
        if (!cancelled) console.error("Load comments error", error);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [liveId, logout, patchSession, session]);

  const fetchMoreComments = async () => {
    if (!liveId || !nextCursor || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const response = await fetchLiveComments(session, liveId, {
        limit: 50,
        direction: "next",
        cursor: nextCursor,
      });
      applyAuthResponses([response.response], patchSession, logout);
      
      if (response.data) {
        const newItems = extractCollection(response.data);
        
        const sortByTimeAsc = (arr: Record<string, unknown>[]) => 
          [...arr].sort((a, b) => {
            const ta = new Date(pickString(a, ["createdAt", "created_at"]) || 0).getTime();
            const tb = new Date(pickString(b, ["createdAt", "created_at"]) || 0).getTime();
            return ta - tb;
          });
          
        setComments((current) => {
          const combined = [...newItems, ...current];
          return dedupeComments(sortByTimeAsc(combined));
        });
        
        // Robust cursor extraction using extractApiData first
        const payload = extractApiData<any>(response.data);
        const meta = asRecord(payload?.pagination || payload?.meta || payload || response.data);
        const cursor = pickString(meta, ["nextCursor", "cursor", "next_cursor", "next", "next_page_cursor"]);
        
        setNextCursor(cursor || null);
        setHasMore(!!cursor);
      }
    } catch (error) {
      console.error("Fetch more comments error", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Helper: update comment in-place by igUserId
  const updateCommentsByIgUserId = useCallback((igUserId: string, patch: Record<string, unknown>) => {
    setComments((current) =>
      current.map((c) => {
        if (pickString(c, ["igUserId"]) === igUserId) {
          return { ...c, ...patch };
        }
        return c;
      })
    );
  }, []);

  // Helper: update comment in-place by _id
  const updateCommentById = useCallback((id: string, patch: Record<string, unknown>) => {
    setComments((current) =>
      current.map((c) => {
        if (pickString(c, ["_id", "id"]) === id) {
          return { ...c, ...patch };
        }
        return c;
      })
    );
  }, []);

  // SSE stream — parse ALL event types
  useEffect(() => {
    if (!liveId) return;

    const controller = new AbortController();
    abortRef.current = controller;

    startTransition(() => setStreamState("connecting"));

    streamLiveComments(
      session,
      liveId,
      (event) => {
        startTransition(() => setStreamState("live"));
        const payload = safelyParseEvent(event.data);
        const eventType = pickString(payload, ["type"]) || event.event;

        switch (eventType) {
          case "new_comment": {
            const nextComment = asRecord(payload.comment);
            if (Object.keys(nextComment).length === 0) return;
            setComments((current) => {
              return dedupeComments([...current, nextComment]).slice(-5000);
            });
            break;
          }

          case "live_stats_updated": {
            const data = asRecord(payload.data || payload);
            setLiveStats({
              totalOrder: pickNumber(data, ["totalOrder", "totalOrders"]) ?? 0,
              totalComment: pickNumber(data, ["totalComment", "totalComments"]) ?? 0,
              totalItems: pickNumber(data, ["totalItems"]) ?? 0,
            });
            break;
          }

          case "customer_info_updated": {
            const data = asRecord(payload.data || payload);
            const igUserId = pickString(data, ["igUserId"]);
            if (igUserId) {
              const closedCount = pickNumber(data, ["customerClosedCount"]);
              const isNew = pickBoolean(data, ["isNewCustomer"]);
              const tag = pickString(data, ["customerTag"]);
              const patch: Record<string, unknown> = {};
              if (closedCount !== null) patch.customerClosedCount = closedCount;
              if (isNew !== null) patch.isNewCustomer = isNew;
              if (tag !== null) patch.customerTag = tag;
              if (Object.keys(patch).length > 0) {
                updateCommentsByIgUserId(igUserId, patch);
              }
            }
            break;
          }

          case "comment_updated": {
            const data = asRecord(payload.data || payload);
            const id = pickString(data, ["_id", "id"]);
            if (id) {
              updateCommentById(id, data);
            }
            break;
          }

          case "backup_event": {
            const data = asRecord(payload.data || payload);
            // Dựa theo api-sse payload có thể chứa comment, targetComment, backupComment
            ['comment', 'targetComment', 'backupComment'].forEach(key => {
              const commentData = asRecord(data[key]);
              const id = pickString(commentData, ["_id", "id"]);
              if (id && Object.keys(commentData).length > 0) {
                updateCommentById(id, commentData);
              }
            });
            break;
          }

          case "connected":
          case "ping":
            // heartbeat / connection confirmation — no action needed
            break;

          default:
            break;
        }
      },
      controller.signal,
    )
      .then((response) => {
        if (!response) return;
        applyAuthResponses([response], patchSession, logout);
        if (!response.ok) {
          startTransition(() => setStreamState("error"));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          startTransition(() => setStreamState("error"));
        }
      });

    return () => { controller.abort(); };
  }, [liveId, logout, patchSession, session, updateCommentsByIgUserId, updateCommentById]);

  const stopStream = () => {
    abortRef.current?.abort();
    setStreamState("stopped");
  };

  return { comments, streamState, stopStream, hasMore, isLoadingMore, fetchMoreComments, liveStats };
}
