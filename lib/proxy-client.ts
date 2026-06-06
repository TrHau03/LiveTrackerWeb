"use client";

import type { SessionSettings } from "@/lib/workspace-session";

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  refreshQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token as string);
    }
  });
  refreshQueue = [];
}

async function executeWithRefresh(
  targetUrl: string,
  options: RequestInit,
  session: SessionSettings,
  headers: Headers
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(targetUrl, options);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log(`[PROXY] Fetch aborted: ${targetUrl}`);
    } else {
      console.error(`[PROXY] Failed to fetch URL: ${targetUrl}`, {
        method: options.method,
        error: err.message,
        cause: err.cause
      });
    }
    throw err;
  }

  console.log(`[PROXY] Request to ${targetUrl} returned ${response.status}. session.refreshToken:`, session.refreshToken ? "PRESENT" : "MISSING");

  if (response.status === 401) {
    if (!session.refreshToken) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("session_force_logout"));
      }
      return response;
    }

    if (isRefreshing) {
      try {
        console.log(`[PROXY] Waiting in queue for ${targetUrl}`);
        const token = await new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });
        headers.set("Authorization", `Bearer ${token}`);
        headers.set("x-access-token", token);
        options.headers = headers;
        response = await fetch(targetUrl, options);
      } catch (err) {
        // queue failed, keep original 401 response
      }
    } else {
      isRefreshing = true;
      try {
        console.log(`[PROXY] Initiating /auth/refresh-token`);
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://admin.livetracker.vn/api/v1";
        const refreshRes = await fetch(`${baseUrl}/auth/refresh-token`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        });
        
        console.log(`[PROXY] /auth/refresh-token returned ${refreshRes.status}`);

        if (refreshRes.ok) {
           const payload = await refreshRes.json() as any;
           const newToken = payload.data?.tokens?.accessToken || payload.data?.accessToken;
           const newRefreshToken = payload.data?.tokens?.refreshToken || payload.data?.refreshToken;
           
           if (newToken) {
             if (typeof window !== "undefined") {
                 window.dispatchEvent(new CustomEvent("session_rehydrated", { 
                     detail: { 
                         accessToken: newToken,
                         refreshToken: newRefreshToken
                     } 
                 }));
             }
             if (newRefreshToken) {
                 session.refreshToken = newRefreshToken;
             }
             processQueue(null, newToken);
             headers.set("Authorization", `Bearer ${newToken}`);
             headers.set("x-access-token", newToken);
             options.headers = headers;
             response = await fetch(targetUrl, options);
           } else {
             throw new Error("No access token in response");
           }
        } else {
           if (refreshRes.status === 401 || refreshRes.status === 403) {
             throw new Error("Refresh token expired or invalid");
           } else {
             throw new Error(`Refresh failed with status ${refreshRes.status}`);
           }
        }
      } catch (err: any) {
        processQueue(err, null);
        if (err?.message === "Refresh token expired or invalid" || err?.message === "No access token in response") {
          if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("session_force_logout"));
          }
        }
      } finally {
        isRefreshing = false;
      }
    }
  }

  return response;
}

type ApiScope = "api" | "root";

export type JsonRecord = Record<string, string | number | boolean>;

export type ProxyRequestOptions = {
  path: string;
  scope?: ApiScope;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  body?: unknown;
  bodyMode?: "json" | "text" | "form-data" | "none";
};

export type ProxyJsonResult<T> = {
  ok: boolean;
  status: number;
  data: T;
  response: Response;
};

const PREFERRED_COLLECTION_KEYS = [
  "items",
  "docs",
  "results",
  "chartData",
  "series",
  "data",
  "lives",
  "comments",
  "orders",
  "customers",
  "notifications",
  "users",
  "shops",
  "plans",
  "subscriptions",
];

export async function proxyRequest<T>(
  session: SessionSettings,
  options: ProxyRequestOptions,
): Promise<ProxyJsonResult<T>> {
  const {
    path,
    scope = "api",
    method = "GET",
    query,
    headers: extraHeaders,
    body,
    bodyMode = body === undefined ? "none" : "json",
  } = options;

  const targetUrl = buildProxyUrl(scope, path, query);
  const headers = new Headers();

  if (session.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
    headers.set("x-access-token", session.accessToken);
  }

  if (session.refreshToken) {
    headers.set("x-refresh-token", session.refreshToken);
  }

  Object.entries(extraHeaders ?? {}).forEach(([key, value]) => {
    headers.set(key, value);
  });

  let requestBody: BodyInit | undefined;

  if (bodyMode === "json" && body !== undefined) {
    headers.set("content-type", "application/json");
    requestBody = JSON.stringify(body);
  } else if (bodyMode === "text" && typeof body === "string") {
    headers.set("content-type", "text/plain;charset=UTF-8");
    requestBody = body;
  } else if (bodyMode === "form-data" && body instanceof FormData) {
    requestBody = body;
  }

  const response = await executeWithRefresh(
    targetUrl,
    {
      method,
      headers,
      body: requestBody,
      cache: "no-store",
    },
    session,
    headers
  );

  let payload: unknown = null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    payload = await response.json();
  } else {
    payload = await response.text();
  }

  return {
    ok: response.ok,
    status: response.status,
    data: payload as T,
    response,
  };
}

export async function proxyDownload(
  session: SessionSettings,
  options: ProxyRequestOptions,
) {
  const targetUrl = buildProxyUrl(
    options.scope ?? "api",
    options.path,
    options.query,
  );
  const headers = new Headers();

  if (session.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
    headers.set("x-access-token", session.accessToken);
  }

  if (session.refreshToken) {
    headers.set("x-refresh-token", session.refreshToken);
  }

  const response = await executeWithRefresh(
    targetUrl,
    {
      method: options.method ?? "GET",
      headers,
      cache: "no-store",
    },
    session,
    headers
  );

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const contentDisposition = response.headers.get("content-disposition") ?? "";

  return {
    ok: response.ok,
    status: response.status,
    filename: extractFilename(contentDisposition),
    url,
    blob,
    response,
  };
}

export async function streamProxyRequest(
  session: SessionSettings,
  options: ProxyRequestOptions,
  onEvent: (event: { event: string; data: string }) => void,
  signal: AbortSignal,
) {
  const targetUrl = buildProxyUrl(
    options.scope ?? "api",
    options.path,
    options.query,
  );

  const headers = new Headers({
    accept: "text/event-stream",
  });

  if (session.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
    headers.set("x-access-token", session.accessToken);
  }

  if (session.refreshToken) {
    headers.set("x-refresh-token", session.refreshToken);
  }

  const response = await executeWithRefresh(
    targetUrl,
    {
      method: options.method ?? "GET",
      headers,
      signal,
      cache: "no-store",
    },
    session,
    headers
  );

  if (!response.ok || !response.body) {
    return response;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() ?? "";

    chunks.forEach((chunk) => {
      const parsed = parseSseEvent(chunk);
      if (parsed.data) {
        onEvent(parsed);
      }
    });
  }

  return response;
}

export function extractApiData<T>(payload: unknown): T | null {
  let current = payload;
  while (
    current &&
    typeof current === "object" &&
    "data" in current &&
    (current as any).data !== null &&
    (typeof (current as any).data === "object" || Array.isArray((current as any).data))
  ) {
    current = (current as { data: any }).data;
  }

  return (current as T) ?? null;
}

export function extractCollection(payload: unknown): Record<string, unknown>[] {
  const root = extractApiData<unknown>(payload);
  const found = findArray(root);
  return found.filter(isRecord);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function pickString(value: unknown, keys: string[]): string {
  const record = asRecord(value);
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return "";
}

export function pickNumber(value: unknown, keys: string[]): number | null {
  const record = asRecord(value);
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string" && candidate.trim()) {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function pickBoolean(value: unknown, keys: string[]): boolean | null {
  const record = asRecord(value);
  for (const key of keys) {
    const candidate = record[key];
    if (typeof candidate === "boolean") {
      return candidate;
    }
  }

  return null;
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("vi-VN").format(value ?? 0);
}

export function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

export function formatDateTime(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "Chưa có";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatLiveDateTime(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "Live - chưa cập nhật";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Live - chưa cập nhật";
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `Live - ${day}/${month}/${year}, ${hours}:${minutes}`;
}

export function formatTimeOnly(value: unknown) {
  if (typeof value !== "string" || !value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function findFirstNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findFirstNumber(entry);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  if (isRecord(value)) {
    for (const candidate of Object.values(value)) {
      const found = findFirstNumber(candidate);
      if (found !== null) {
        return found;
      }
    }
  }

  return null;
}

function buildProxyUrl(
  scope: ApiScope,
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>,
) {
  const normalizedPath = path === "/" ? "" : path;
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://admin.livetracker.vn/api/v1";
  const url = new URL(`${baseUrl}${normalizedPath}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findArray(value: unknown, depth = 0): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (!isRecord(value) || depth > 4) {
    return [];
  }

  for (const key of PREFERRED_COLLECTION_KEYS) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      return candidate.filter(isRecord);
    }
  }

  for (const candidate of Object.values(value)) {
    const found = findArray(candidate, depth + 1);
    if (found.length > 0) {
      return found;
    }
  }

  return [];
}

function parseSseEvent(block: string) {
  let event = "message";
  const dataLines: string[] = [];

  block.split(/\r?\n/).forEach((line) => {
    if (line.startsWith("event:")) {
      event = line.replace("event:", "").trim();
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.replace("data:", "").trim());
    }
  });

  return {
    event,
    data: dataLines.join("\n"),
  };
}

function extractFilename(contentDisposition: string) {
  const match =
    contentDisposition.match(/filename\*=UTF-8''([^;]+)/i) ??
    contentDisposition.match(/filename="?([^"]+)"?/i);

  return match?.[1] ? decodeURIComponent(match[1]) : "download.bin";
}
