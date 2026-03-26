import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  ApiAuth,
  ApiBodyMode,
  ApiCatalog,
  ApiFileField,
  ApiOperation,
  ApiResponseMode,
  ApiScope,
  ApiSection,
  AppTabId,
  HttpMethod,
} from "@/lib/api-types";

type JsonShape = Record<string, string | number | boolean>;
type DtoMap = Map<string, unknown>;

type OperationOverride = Partial<
  Pick<
    ApiOperation,
    | "description"
    | "sampleBody"
    | "sampleFormData"
    | "samplePathParams"
    | "sampleQuery"
    | "headersSample"
    | "fileFields"
    | "bodyMode"
    | "responseMode"
  >
>;

const DOC_PATH = join(process.cwd(), "FE_API_INTEGRATION.md");
const API_PREFIX = "/api/v1";

const SECTION_DESCRIPTIONS: Record<string, string> = {
  auth: "Authentication, token lifecycle and device registration.",
  users: "Profiles, shops, templates and analytics endpoints.",
  lives: "Live session discovery, lookup and moderation endpoints.",
  comments: "Realtime comments, SSE streams and comment operations.",
  orders: "Order management, bill delivery and Excel export.",
  customers: "Customer profiles, tags and relationship history.",
  tags: "Tag CRUD for audience segmentation.",
  notifications_push_live_activities:
    "Notifications, Expo push tokens and live activities.",
  instagram: "Instagram connection, webhook registration and public webhook.",
  subscriptions: "Subscription plans, renewals and per-user entitlements.",
  statistics: "Revenue analytics scoped by role.",
  provinces: "Public province and ward dictionaries.",
  ota: "OTA package management and binary versions.",
  admin_html_routes: "Server-rendered admin routes exposed by the backend.",
};

const TAB_MAP: Record<string, Exclude<AppTabId, "overview">> = {
  auth: "identity",
  users: "identity",
  subscriptions: "identity",
  lives: "live",
  comments: "live",
  notifications_push_live_activities: "live",
  instagram: "live",
  orders: "commerce",
  customers: "commerce",
  tags: "commerce",
  statistics: "platform",
  provinces: "platform",
  ota: "platform",
  admin_html_routes: "platform",
};

const SAMPLE_PATH_VALUES: Record<string, string> = {
  id: "66f9e2bce6c100001234abcd",
  userId: "66f9e2bce6c1000012340001",
  liveId: "66f9e2bce6c1000012340002",
  shopId: "66f9e2bce6c1000012340003",
  commentId: "66f9e2bce6c1000012340004",
  customerId: "66f9e2bce6c1000012340005",
  tagId: "66f9e2bce6c1000012340006",
  connectionId: "conn_demo_001",
  provinceCode: "79",
  instagramUserId: "17841400000000000",
};

const FILE_ACCEPT_BY_NAME: Record<string, string> = {
  file: "image/*",
  image: "image/*",
  androidBundle: ".zip,.apk,.aab",
  iosBundle: ".zip,.ipa",
};

const OPERATION_OVERRIDES: Record<string, OperationOverride> = {
  "POST /auth/refresh-token": {
    sampleBody: {
      refreshToken: "paste_refresh_token_here",
    },
  },
  "POST /auth/logout": {
    sampleBody: {
      refreshToken: "optional_refresh_token_here",
    },
  },
  "POST /auth/register-device": {
    sampleBody: {
      token: "expo_push_device_token",
    },
  },
  "POST /auth/remove-device": {
    sampleBody: {
      token: "expo_push_device_token",
    },
  },
  "POST /users/me/message-template/images": {
    sampleQuery: {
      templateType: "order1",
    },
    sampleFormData: {
      oldImageUrl: "",
    },
    fileFields: [{ name: "file", accept: "image/*" }],
  },
  "GET /lives/metrics": {
    sampleQuery: {
      endpoint: "/orders",
      method: "GET",
      statusCode: 200,
      userId: "66f9e2bce6c1000012340001",
    },
  },
  "POST /comments/sendMessage/:commentId": {
    bodyMode: "text",
    sampleBody: "Xin chao, don cua ban da duoc ghi nhan.",
  },
  "POST /orders/:id/send-bill": {
    sampleFormData: {
      igUserId: "17841400000000000",
    },
    fileFields: [{ name: "image", accept: "image/*" }],
  },
  "GET /customers/user/my-customers": {
    sampleQuery: {
      page: 1,
      limit: 10,
      search: "",
    },
  },
  "GET /customers/userId/:userId": {
    sampleQuery: {
      page: 1,
      limit: 10,
      search: "",
    },
  },
  "GET /customers/:customerId": {
    sampleQuery: {
      includeHistories: true,
    },
  },
  "GET /instagram/webhook": {
    sampleQuery: {
      "hub.mode": "subscribe",
      "hub.verify_token": "verify_token",
      "hub.challenge": "123456",
    },
  },
  "POST /instagram/webhook": {
    sampleBody: {
      object: "instagram",
      entry: [],
    },
    headersSample: {
      "x-hub-signature-256": "sha256=demo_signature",
    },
  },
  "GET /ota/check": {
    sampleQuery: {
      binaryVersion: "1.0.0",
    },
  },
  "POST /ota": {
    sampleFormData: {
      version: "1.0.1",
      binaryVersion: "1.0.0",
    },
    fileFields: [
      { name: "androidBundle", accept: ".zip,.apk,.aab" },
      { name: "iosBundle", accept: ".zip,.ipa" },
    ],
  },
  "POST /ota/binary": {
    sampleBody: {
      version: "1.0.1",
    },
  },
  "GET /": {
    responseMode: "html",
  },
};

export function getApiCatalog(): ApiCatalog {
  const markdown = readFileSync(DOC_PATH, "utf8");
  const dtoMap = extractDtos(markdown);
  const sections = extractSections(markdown, dtoMap);

  return {
    sections,
    totalOperations: sections.reduce(
      (total, section) => total + section.operations.length,
      0,
    ),
  };
}

function extractDtos(markdown: string): DtoMap {
  const dtoMap = new Map<string, unknown>();
  const lines = markdown.split(/\r?\n/);
  let currentDtoName: string | null = null;
  let collecting = false;
  let buffer: string[] = [];

  for (const line of lines) {
    const dtoMatch = line.match(/^`([^`]+)`$/);
    if (dtoMatch) {
      currentDtoName = dtoMatch[1];
      continue;
    }

    if (line.trim() === "```json") {
      collecting = true;
      buffer = [];
      continue;
    }

    if (line.trim() === "```" && collecting) {
      collecting = false;
      if (currentDtoName) {
        try {
          dtoMap.set(currentDtoName, JSON.parse(buffer.join("\n")));
        } catch {
          // Ignore non-JSON snippets. The catalog falls back to manual samples.
        }
      }
      currentDtoName = null;
      buffer = [];
      continue;
    }

    if (collecting) {
      buffer.push(line);
    }
  }

  return dtoMap;
}

function extractSections(markdown: string, dtoMap: DtoMap): ApiSection[] {
  const lines = markdown.split(/\r?\n/);
  const sections = new Map<string, ApiSection>();
  let currentSectionTitle = "";
  let currentSectionId = "";

  for (const line of lines) {
    const heading = line.match(/^##\s+\d+\.\s+(.+)$/);
    if (heading) {
      currentSectionTitle = heading[1].trim();
      currentSectionId = slugify(currentSectionTitle);
      continue;
    }

    if (!line.startsWith("| `")) {
      continue;
    }

    if (!(currentSectionId in TAB_MAP)) {
      continue;
    }

    const operation = parseOperationLine(
      line,
      currentSectionId,
      currentSectionTitle,
      dtoMap,
    );

    if (!operation) {
      continue;
    }

    const existing = sections.get(currentSectionId);
    if (existing) {
      existing.operations.push(operation);
      continue;
    }

    sections.set(currentSectionId, {
      id: currentSectionId,
      title: currentSectionTitle,
      tab: TAB_MAP[currentSectionId],
      description:
        SECTION_DESCRIPTIONS[currentSectionId] ??
        "Collected endpoints generated from the integration guide.",
      operations: [operation],
    });
  }

  return Array.from(sections.values());
}

function parseOperationLine(
  line: string,
  sectionId: string,
  sectionTitle: string,
  dtoMap: DtoMap,
): ApiOperation | null {
  const columns = splitTableColumns(line);
  if (columns.length < 4) {
    return null;
  }

  const method = stripCode(columns[0]) as HttpMethod;
  const rawPath = stripCode(columns[1]);
  const authText = stripCode(columns[2]);
  const roleText = stripCode(columns[3] ?? "");
  const requestHint =
    columns.length >= 6 ? stripCode(columns[4]) : "none";
  const responseHint =
    columns.length >= 6 ? stripCode(columns[5]) : stripCode(columns[3] ?? "");

  const normalizedPath = stripInlineQueryFromPath(rawPath);
  const inlineQuerySample = extractInlineQuery(rawPath);
  const auth = inferAuth(authText);
  const bodyMode = inferBodyMode(requestHint, normalizedPath);
  const responseMode = inferResponseMode(
    normalizedPath,
    requestHint,
    responseHint,
    sectionId,
  );
  const scope = inferScope(normalizedPath);
  const samplePathParams = extractPathParams(normalizedPath);
  const requestSamples = inferRequestSamples(
    normalizedPath,
    requestHint,
    bodyMode,
    dtoMap,
  );
  const overrideKey = `${method} ${normalizedPath}`;
  const override = OPERATION_OVERRIDES[overrideKey];

  return {
    id: slugify(`${sectionId}-${method}-${normalizedPath}`),
    sectionId,
    sectionTitle,
    tab: TAB_MAP[sectionId],
    method,
    path: normalizedPath,
    scope,
    auth,
    role: roleText,
    description:
      override?.description ??
      normalizeDescription(responseHint || requestHint || `${method} ${normalizedPath}`),
    requestHint,
    responseHint,
    bodyMode: override?.bodyMode ?? bodyMode,
    responseMode: override?.responseMode ?? responseMode,
    samplePathParams: {
      ...samplePathParams,
      ...(override?.samplePathParams ?? {}),
    },
    sampleQuery: {
      ...inlineQuerySample,
      ...requestSamples.sampleQuery,
      ...(override?.sampleQuery ?? {}),
    },
    sampleBody: override?.sampleBody ?? requestSamples.sampleBody,
    sampleFormData: {
      ...requestSamples.sampleFormData,
      ...(override?.sampleFormData ?? {}),
    },
    fileFields: override?.fileFields ?? requestSamples.fileFields,
    headersSample: {
      ...requestSamples.headersSample,
      ...(override?.headersSample ?? {}),
    },
  };
}

function splitTableColumns(line: string): string[] {
  const placeholder = "__ESCAPED_PIPE__";
  return line
    .replaceAll("\\|", placeholder)
    .split("|")
    .map((part) => part.trim().replaceAll(placeholder, "|"))
    .filter(Boolean);
}

function stripCode(value: string): string {
  return value.replaceAll("`", "").trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
}

function inferAuth(authText: string): ApiAuth {
  if (authText.includes("Cookie")) {
    return "admin-cookie";
  }

  if (authText.toLowerCase() === "no") {
    return "public";
  }

  return "bearer";
}

function inferScope(path: string): ApiScope {
  if (path === "/" || path.startsWith("/web/admin")) {
    return "root";
  }

  return "api";
}

function inferBodyMode(requestHint: string, path: string): ApiBodyMode {
  const lowerHint = requestHint.toLowerCase();

  if (lowerHint.includes("multipart/form-data")) {
    return "form-data";
  }

  if (path === "/comments/sendMessage/:commentId" || lowerHint === "body: string") {
    return "text";
  }

  if (lowerHint.includes("body:")) {
    return "json";
  }

  return "none";
}

function inferResponseMode(
  path: string,
  requestHint: string,
  responseHint: string,
  sectionId: string,
): ApiResponseMode {
  const combined = `${requestHint} ${responseHint}`.toLowerCase();

  if (sectionId === "admin_html_routes" || path === "/" || path.startsWith("/web/admin")) {
    return "html";
  }

  if (combined.includes("sse") || combined.includes("text/event-stream")) {
    return "sse";
  }

  if (combined.includes("excel") || combined.includes("attachment") || combined.includes("file stream")) {
    return "download";
  }

  return "json";
}

function extractPathParams(path: string): Record<string, string> {
  const params = Array.from(path.matchAll(/:([A-Za-z0-9_]+)/g));
  return params.reduce<Record<string, string>>((accumulator, match) => {
    const key = match[1];
    accumulator[key] = SAMPLE_PATH_VALUES[key] ?? `sample_${key}`;
    return accumulator;
  }, {});
}

function extractInlineQuery(path: string): JsonShape {
  const [, queryString] = path.split("?");
  if (!queryString) {
    return {};
  }

  const entries = queryString
    .split("&")
    .map((segment) => segment.split("="))
    .filter(([key]) => Boolean(key));

  return entries.reduce<JsonShape>((accumulator, [key, value]) => {
    const normalizedValue = (value ?? "")
      .split("|")[0]
      .replaceAll("\\", "")
      .trim();
    accumulator[key] = normalizedValue || "";
    return accumulator;
  }, {});
}

function stripInlineQueryFromPath(path: string): string {
  return path.split("?")[0];
}

function inferRequestSamples(
  path: string,
  requestHint: string,
  bodyMode: ApiBodyMode,
  dtoMap: DtoMap,
): Pick<
  ApiOperation,
  "sampleQuery" | "sampleBody" | "sampleFormData" | "fileFields" | "headersSample"
> {
  const dtoName = extractDtoName(requestHint);
  const dtoPayload = dtoName ? dtoMap.get(dtoName) : undefined;

  const sampleQuery =
    requestHint.startsWith("query:")
      ? (dtoPayload as JsonShape | undefined) ??
        inferInlineFieldShape(requestHint.replace("query:", ""))
      : {};

  if (bodyMode === "form-data") {
    return {
      sampleQuery,
      sampleBody: {},
      sampleFormData: inferFormDataFields(requestHint),
      fileFields: inferFormDataFileFields(requestHint),
      headersSample: {},
    };
  }

  if (bodyMode === "text") {
    return {
      sampleQuery,
      sampleBody: "sample_text_body",
      sampleFormData: {},
      fileFields: [],
      headersSample: {},
    };
  }

  if (bodyMode === "json") {
    return {
      sampleQuery,
      sampleBody:
        dtoPayload ??
        inferInlineBody(requestHint) ??
        inferFallbackBody(path) ??
        {},
      sampleFormData: {},
      fileFields: [],
      headersSample: {},
    };
  }

  return {
    sampleQuery,
    sampleBody: {},
    sampleFormData: {},
    fileFields: [],
    headersSample: {},
  };
}

function extractDtoName(requestHint: string): string | null {
  const dtoMatch = requestHint.match(/(body|query):\s*([A-Za-z0-9_]+Dto)/);
  return dtoMatch?.[2] ?? null;
}

function inferInlineBody(requestHint: string): JsonShape | null {
  const bodyMatch = requestHint.match(/body:\s*\{([^}]+)\}/);
  if (!bodyMatch) {
    return null;
  }

  return inferInlineFieldShape(bodyMatch[1]);
}

function inferInlineFieldShape(text: string): JsonShape {
  return text
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .reduce<JsonShape>((accumulator, field) => {
      const cleanField = field.replaceAll("`", "").replace(/\?$/, "");
      const [rawKey, rawValue] = cleanField.split("=");
      const key = rawKey.trim();
      const value = rawValue?.trim();

      if (!key) {
        return accumulator;
      }

      accumulator[key] = inferValueFromName(key, value);
      return accumulator;
    }, {});
}

function inferValueFromName(
  key: string,
  explicitValue?: string,
): string | number | boolean {
  if (explicitValue === "true") {
    return true;
  }

  if (explicitValue === "false") {
    return false;
  }

  if (explicitValue && !Number.isNaN(Number(explicitValue))) {
    return Number(explicitValue);
  }

  if (key === "page") {
    return 1;
  }

  if (key === "limit") {
    return 10;
  }

  if (key.toLowerCase().includes("date")) {
    return "2026-03-27T00:00:00.000Z";
  }

  if (key.startsWith("is")) {
    return true;
  }

  if (key.toLowerCase().includes("statuscode")) {
    return 200;
  }

  return explicitValue ?? "";
}

function inferFormDataFields(requestHint: string): Record<string, string | number | boolean> {
  const fieldMatch = requestHint.match(/multipart\/form-data`?:\s*(.+)$/);
  if (!fieldMatch) {
    return {};
  }

  return fieldMatch[1]
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .reduce<Record<string, string | number | boolean>>((accumulator, field) => {
      const normalizedField = field.replaceAll("`", "").replace(/\?$/, "");
      if (isLikelyFileField(normalizedField)) {
        return accumulator;
      }

      accumulator[normalizedField] = "";
      return accumulator;
    }, {});
}

function inferFormDataFileFields(requestHint: string): ApiFileField[] {
  const fieldMatch = requestHint.match(/multipart\/form-data`?:\s*(.+)$/);
  if (!fieldMatch) {
    return [];
  }

  return fieldMatch[1]
    .split(",")
    .map((field) => field.trim().replaceAll("`", "").replace(/\?$/, ""))
    .filter(isLikelyFileField)
    .map((name) => ({
      name,
      accept: FILE_ACCEPT_BY_NAME[name],
    }));
}

function isLikelyFileField(name: string): boolean {
  return ["file", "image", "androidBundle", "iosBundle"].includes(name);
}

function inferFallbackBody(path: string): JsonShape | null {
  if (path === "/instagram/webhook") {
    return {
      object: "instagram",
    };
  }

  return null;
}

function normalizeDescription(value: string): string {
  return value
    .replaceAll(API_PREFIX, "")
    .replaceAll("`", "")
    .replace(/\s+/g, " ")
    .trim();
}
