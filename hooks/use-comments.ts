/**
 * useComments — Hook cho SSE comment stream + initial comment load.
 */
import { startTransition, useEffect, useRef, useState } from "react";

import { useSession } from "@/components/session-provider";
import { fetchLiveComments, streamLiveComments } from "@/lib/services/lives-service";
import { extractCollection, asRecord, pickString } from "@/lib/proxy-client";
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
  const abortRef = useRef<AbortController | null>(null);

  // Initial comment load
  useEffect(() => {
    if (!liveId) return;
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
          setComments(extractCollection(response.data).reverse());
        }
      } catch (error) {
        if (!cancelled) console.error("Load comments error", error);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [liveId, logout, patchSession, session]);

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
          return dedupeComments([nextComment, ...current.reverse()])
            .slice(0, 100)
            .reverse();
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

  return { comments, streamState, stopStream };
}
