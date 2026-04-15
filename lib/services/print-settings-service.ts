/**
 * Print Settings Service — Fetch and update print template settings.
 */
import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export async function fetchPrintTemplate(session: SessionSettings) {
  return proxyRequest(session, {
    path: "/users/me/print-template",
  });
}

export async function updatePrintTemplate(
  session: SessionSettings,
  body: Record<string, unknown>,
) {
  return proxyRequest(session, {
    path: "/users/me/print-template",
    method: "PATCH",
    body,
  });
}
