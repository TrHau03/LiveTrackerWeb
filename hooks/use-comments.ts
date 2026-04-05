/**
 * useComments — Hook cho SSE comment stream + initial comment load.
 */
import { startTransition, useEffect, useRef, useState } from "react";

import { useSession } from "@/components/session-provider";
import { fetchLiveComments, streamLiveComments } from "@/lib/services/lives-service";
import { extractCollection, asRecord, pickString, extractApiData } from "@/lib/proxy-client";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

type StreamState = "connecting" | "live" | "stopped" | "error";

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
  const abortRef = useRef<AbortController | null>(null);

  // Initial comment load
  useEffect(() => {
    if (!liveId) {
      setComments([]);
      return;
    }
    
    // Reset state for new liveId
    setComments([]);
    setNextCursor(null);
    setHasMore(false);
    
    let cancelled = false;

    async function load() {
      try {
        const response = await fetchLiveComments(session, liveId!, {
          limit: 50,
          direction: "next",
        });
        if (cancelled) return;
        applyAuthResponses([response.response], patchSession, logout);
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
          console.log(`[useComments] Initial load complete. Items: ${items.length}, hasMore: ${!!cursor}, nextCursor: ${cursor}`);
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
        console.log(`Fetched more comments: ${newItems.length} items.`);
        
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
        console.log(`[useComments] Fetch more complete. New items: ${newItems.length}, hasMore: ${!!cursor}, nextCursor: ${cursor}`);
      }
    } catch (error) {
      console.error("Fetch more comments error", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // SSE stream
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
        const nextComment = asRecord(payload.comment);
        if (Object.keys(nextComment).length === 0) return;
        setComments((current) => {
          // current is [oldest -> newest]
          // we want to append nextComment to the end
          // Dùng slice(-5000) để giữ lại tối đa 5000 records thay vì 200, tránh hiện tượng time gap khi user scroll
          return dedupeComments([...current, nextComment]).slice(-5000);
        });
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
  }, [liveId, logout, patchSession, session]);

  const stopStream = () => {
    abortRef.current?.abort();
    setStreamState("stopped");
  };

  return { comments, streamState, stopStream, hasMore, isLoadingMore, fetchMoreComments };
}
