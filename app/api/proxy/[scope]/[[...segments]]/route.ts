import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_PREFIX = "/api/v1";
const BASE_API_URL = process.env.API_URL ?? "";
const INTERNAL_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "cookie",
  "x-backend-base-url",
  "x-access-token",
  "x-refresh-token",
  "x-admin-token",
]);
const STRIP_RESPONSE_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

type ForwardedBody =
  | { kind: "empty" }
  | { kind: "text"; value: string; contentType: string | null }
  | { kind: "form-data"; value: FormData }
  | { kind: "bytes"; value: ArrayBuffer; contentType: string | null };

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handleProxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handleProxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handleProxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  return handleProxyRequest(request, context);
}

async function handleProxyRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const params = await context.params;
  const baseUrl = normalizeBaseUrl(BASE_API_URL);

  if (!baseUrl) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing API_URL environment variable.",
      },
      { status: 500 },
    );
  }

  const targetUrl = buildTargetUrl(baseUrl, params.scope, params.segments, request.nextUrl.searchParams);
  const body = await readForwardedBody(request);
  const accessToken = request.headers.get("x-access-token");
  const refreshToken = request.headers.get("x-refresh-token");
  const adminToken = request.headers.get("x-admin-token");

  const attempt = await forwardWithRetry({
    body,
    method: request.method,
    requestHeaders: request.headers,
    targetUrl,
    accessToken,
    refreshToken,
    adminToken,
    baseUrl,
  });

  const responseHeaders = sanitizeResponseHeaders(attempt.response.headers);
  if (attempt.refreshedAccessToken) {
    responseHeaders.set(
      "x-refreshed-access-token",
      attempt.refreshedAccessToken,
    );
  }
  responseHeaders.set("x-proxy-target", targetUrl.toString());

  return new Response(attempt.response.body, {
    status: attempt.response.status,
    statusText: attempt.response.statusText,
    headers: responseHeaders,
  });
}

function sanitizeResponseHeaders(source: Headers): Headers {
  const headers = new Headers(source);

  STRIP_RESPONSE_HEADERS.forEach((header) => {
    headers.delete(header);
  });

  return headers;
}

function normalizeBaseUrl(baseUrl: string | null): string {
  if (!baseUrl) {
    return "";
  }

  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith(API_PREFIX)) {
    return trimmed.slice(0, -API_PREFIX.length);
  }

  return trimmed;
}

function buildTargetUrl(
  baseUrl: string,
  scope: string,
  segments: string[] | undefined,
  searchParams: URLSearchParams,
): URL {
  const normalizedSegments = segments?.join("/") ?? "";
  const path =
    scope === "root"
      ? normalizedSegments
        ? `/${normalizedSegments}`
        : "/"
      : `${API_PREFIX}${normalizedSegments ? `/${normalizedSegments}` : ""}`;

  const url = new URL(path, `${baseUrl}/`);
  url.search = searchParams.toString();
  return url;
}

async function readForwardedBody(request: NextRequest): Promise<ForwardedBody> {
  if (request.method === "GET" || request.method === "DELETE") {
    return { kind: "empty" };
  }

  const contentType = request.headers.get("content-type");
  if (!contentType) {
    return { kind: "empty" };
  }

  if (contentType.includes("multipart/form-data")) {
    return {
      kind: "form-data",
      value: await request.formData(),
    };
  }

  if (
    contentType.includes("application/json") ||
    contentType.includes("text/plain") ||
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    return {
      kind: "text",
      value: await request.text(),
      contentType,
    };
  }

  return {
    kind: "bytes",
    value: await request.arrayBuffer(),
    contentType,
  };
}

async function forwardWithRetry(args: {
  body: ForwardedBody;
  method: string;
  requestHeaders: Headers;
  targetUrl: URL;
  accessToken: string | null;
  refreshToken: string | null;
  adminToken: string | null;
  baseUrl: string;
}): Promise<{
  response: Response;
  refreshedAccessToken?: string;
}> {
  let response = await performFetch({
    ...args,
    accessToken: args.accessToken,
  });

  if (response.status !== 401 || !args.refreshToken) {
    return { response };
  }

  const refreshedAccessToken = await refreshAccessToken(
    args.baseUrl,
    args.refreshToken,
  );

  if (!refreshedAccessToken) {
    return { response };
  }

  response = await performFetch({
    ...args,
    accessToken: refreshedAccessToken,
  });

  return {
    response,
    refreshedAccessToken,
  };
}

async function refreshAccessToken(
  baseUrl: string,
  refreshToken: string,
): Promise<string | null> {
  const refreshUrl = new URL(`${API_PREFIX}/auth/refresh-token`, `${baseUrl}/`);
  const response = await fetch(refreshUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  try {
    const json = (await response.json()) as {
      data?: { accessToken?: string };
    };
    return json.data?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function performFetch(args: {
  body: ForwardedBody;
  method: string;
  requestHeaders: Headers;
  targetUrl: URL;
  accessToken: string | null;
  adminToken: string | null;
}): Promise<Response> {
  const headers = new Headers();

  args.requestHeaders.forEach((value, key) => {
    if (INTERNAL_HEADERS.has(key.toLowerCase())) {
      return;
    }

    headers.set(key, value);
  });

  if (args.accessToken) {
    headers.set("authorization", `Bearer ${args.accessToken}`);
  }

  if (args.adminToken) {
    headers.set("cookie", `adminToken=${args.adminToken}`);
  }

  const body = cloneBody(args.body, headers);

  return fetch(args.targetUrl, {
    method: args.method,
    headers,
    body,
    cache: "no-store",
    redirect: "follow",
  });
}

function cloneBody(
  body: ForwardedBody,
  headers: Headers,
): BodyInit | undefined {
  if (body.kind === "empty") {
    return undefined;
  }

  if (body.kind === "form-data") {
    headers.delete("content-type");
    return body.value;
  }

  if (body.kind === "text") {
    if (body.contentType) {
      headers.set("content-type", body.contentType);
    }
    return body.value;
  }

  if (body.contentType) {
    headers.set("content-type", body.contentType);
  }

  return body.value.slice(0);
}

type RouteContext = {
  params: Promise<{
    scope: string;
    segments?: string[];
  }>;
};
