"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ApiCatalog,
  ApiOperation,
  ApiResponseMode,
  ApiSection,
  AppTabId,
} from "@/lib/api-types";

type SessionSettings = {
  baseUrl: string;
  accessToken: string;
  refreshToken: string;
  adminToken: string;
};

type ConsoleResult = {
  operationId: string;
  operationLabel: string;
  targetUrl: string;
  status: number;
  ok: boolean;
  method: string;
  path: string;
  mode: ApiResponseMode;
  contentType: string;
  durationMs: number;
  summary: string;
  payload?: unknown;
  download?: {
    url: string;
    filename: string;
    size: number;
  };
};

type OperationCardProps = {
  operation: ApiOperation;
  session: SessionSettings;
  onSessionPatch: (patch: Partial<SessionSettings>) => void;
  onResult: (result: ConsoleResult) => void;
  defaultExpanded?: boolean;
};

type JsonRecord = Record<string, string | number | boolean>;

const STORAGE_KEY = "live-tracker-web.integration-session";
const DEFAULT_SESSION: SessionSettings = {
  baseUrl: "http://localhost:3000",
  accessToken: "",
  refreshToken: "",
  adminToken: "",
};

const TAB_ITEMS: Array<{
  id: AppTabId;
  label: string;
  shortLabel: string;
  kicker: string;
}> = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Home",
    kicker: "Setup, docs summary and live status.",
  },
  {
    id: "identity",
    label: "Identity",
    shortLabel: "ID",
    kicker: "Auth, users, shops, metrics and subscriptions.",
  },
  {
    id: "live",
    label: "Live Ops",
    shortLabel: "Live",
    kicker: "Lives, comments, notifications and Instagram flows.",
  },
  {
    id: "commerce",
    label: "Commerce",
    shortLabel: "Sales",
    kicker: "Orders, customers and tags.",
  },
  {
    id: "platform",
    label: "Platform",
    shortLabel: "Ops",
    kicker: "Statistics, provinces, OTA and admin HTML routes.",
  },
];

export function IntegrationHub({ catalog }: { catalog: ApiCatalog }) {
  const [session, setSession] = useState<SessionSettings>(DEFAULT_SESSION);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTabId>("overview");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [latestResult, setLatestResult] = useState<ConsoleResult | null>(null);
  const previousDownloadUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const storedSession = window.localStorage.getItem(STORAGE_KEY);
    const nextSession = storedSession
      ? safelyParseSession(storedSession)
      : DEFAULT_SESSION;

    startTransition(() => {
      setSession(nextSession);
      setIsHydrated(true);
    });

    return;
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [isHydrated, session]);

  useEffect(() => {
    return () => {
      if (previousDownloadUrlRef.current) {
        URL.revokeObjectURL(previousDownloadUrlRef.current);
      }
    };
  }, []);

  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredSections =
    activeTab === "overview"
      ? []
      : catalog.sections
          .filter((section) => section.tab === activeTab)
          .map((section) => ({
            ...section,
            operations: section.operations.filter((operation) =>
              matchesOperation(operation, normalizedSearch, section.title),
            ),
          }))
          .filter((section) => section.operations.length > 0);

  const tabCounts = getTabCounts(catalog.sections);
  const allOperations = catalog.sections.flatMap((section) => section.operations);
  const sseCount = allOperations.filter(
    (operation) => operation.responseMode === "sse",
  ).length;
  const uploadCount = allOperations.filter(
    (operation) => operation.bodyMode === "form-data",
  ).length;
  const downloadCount = allOperations.filter(
    (operation) => operation.responseMode === "download",
  ).length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(237,111,87,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(17,65,92,0.14),_transparent_28%),linear-gradient(180deg,_#f6f0e8_0%,_#f3ede5_45%,_#efe7dc_100%)] pb-24 text-slate-900 md:pb-10">
      <header className="border-b border-slate-900/10 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex rounded-full border border-slate-900/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                FE API Integration Hub
              </span>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-950 md:text-5xl">
                LiveTracker command surface for every documented backend route.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
                Responsive workbench with token-aware proxying, bottom tabbar on
                mobile, upload/download helpers and realtime SSE inspection.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 self-start rounded-[28px] border border-slate-900/10 bg-[#10334b] p-4 text-white shadow-[0_24px_80px_rgba(16,51,75,0.18)]">
              <MetricChip label="APIs" value={String(catalog.totalOperations)} />
              <MetricChip label="Uploads" value={String(uploadCount)} />
              <MetricChip label="Streams" value={String(sseCount)} />
            </div>
          </div>

          <div className="hidden gap-3 md:flex">
            {TAB_ITEMS.map((tab) => {
              const active = tab.id === activeTab;
              const count =
                tab.id === "overview"
                  ? catalog.totalOperations
                  : tabCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    startTransition(() => {
                      setActiveTab(tab.id);
                    })
                  }
                  className={`flex min-w-[148px] flex-1 flex-col rounded-[24px] border px-4 py-3 text-left transition ${
                    active
                      ? "border-transparent bg-[#10334b] text-white shadow-[0_20px_60px_rgba(16,51,75,0.22)]"
                      : "border-slate-900/10 bg-white/70 text-slate-700 hover:border-slate-900/20 hover:bg-white"
                  }`}
                >
                  <span className="text-[11px] uppercase tracking-[0.22em] text-current/70">
                    {tab.shortLabel}
                  </span>
                  <span className="mt-2 text-base font-semibold">{tab.label}</span>
                  <span className="mt-2 text-xs text-current/70">
                    {count} ops
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <SettingsPanel
            session={session}
            onChange={setSession}
            onReset={() => setSession(DEFAULT_SESSION)}
          />
          <ConsolePanel
            latestResult={latestResult}
            downloadCount={downloadCount}
            totalOperations={catalog.totalOperations}
          />
        </aside>

        <main className="space-y-6">
          <div className="rounded-[32px] border border-slate-900/10 bg-white/75 p-5 shadow-[0_20px_80px_rgba(110,81,41,0.08)] backdrop-blur-xl md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Workspace filter
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  {TAB_ITEMS.find((tab) => tab.id === activeTab)?.label}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {TAB_ITEMS.find((tab) => tab.id === activeTab)?.kicker}
                </p>
              </div>

              <label className="flex w-full max-w-lg flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  Search endpoints
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filter by path, method, role or description"
                  className="h-12 rounded-2xl border border-slate-900/10 bg-white px-4 text-sm outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
                />
              </label>
            </div>
          </div>

          {activeTab === "overview" ? (
            <OverviewPanel
              sections={catalog.sections}
              totalOperations={catalog.totalOperations}
              sseCount={sseCount}
              uploadCount={uploadCount}
              downloadCount={downloadCount}
              tabCounts={tabCounts}
              onGoToTab={(tab) =>
                startTransition(() => {
                  setActiveTab(tab);
                })
              }
            />
          ) : (
            <div className="space-y-6">
              {filteredSections.length === 0 ? (
                <EmptyState search={search} />
              ) : (
                filteredSections.map((section, sectionIndex) => (
                  <SectionPanel
                    key={section.id}
                    section={section}
                    session={session}
                    onSessionPatch={(patch) =>
                      setSession((current) => ({
                        ...current,
                        ...patch,
                      }))
                    }
                    onResult={(result) => {
                      if (previousDownloadUrlRef.current) {
                        URL.revokeObjectURL(previousDownloadUrlRef.current);
                      }
                      previousDownloadUrlRef.current = result.download?.url ?? null;
                      setLatestResult(result);
                    }}
                    defaultExpandedIndex={sectionIndex === 0 ? 0 : -1}
                  />
                ))
              )}
            </div>
          )}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-900/10 bg-white/92 px-2 py-2 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-5 gap-2">
          {TAB_ITEMS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  startTransition(() => {
                    setActiveTab(tab.id);
                  })
                }
                className={`rounded-2xl px-2 py-2 text-center text-[11px] font-semibold transition ${
                  active
                    ? "bg-[#10334b] text-white shadow-[0_16px_30px_rgba(16,51,75,0.24)]"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <div className="text-[10px] uppercase tracking-[0.18em]">
                  {tab.shortLabel}
                </div>
                <div className="mt-1">{tab.label}</div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function SettingsPanel({
  session,
  onChange,
  onReset,
}: {
  session: SessionSettings;
  onChange: (value: SessionSettings) => void;
  onReset: () => void;
}) {
  return (
    <section className="rounded-[32px] border border-slate-900/10 bg-[#0c2435] p-5 text-white shadow-[0_24px_80px_rgba(16,51,75,0.22)] md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/60">
            Runtime session
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Backend proxy settings
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-white/15 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:border-white/30 hover:text-white"
        >
          Reset
        </button>
      </div>

      <div className="mt-6 space-y-4">
        <Field
          label="Backend origin"
          hint="Use the backend origin only. `/api/v1` is added automatically for JSON APIs."
        >
          <input
            value={session.baseUrl}
            onChange={(event) =>
              onChange({
                ...session,
                baseUrl: event.target.value,
              })
            }
            placeholder="http://localhost:3000"
            className="h-12 rounded-2xl border border-white/10 bg-white/8 px-4 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
          />
        </Field>

        <Field
          label="Access token"
          hint="Used for Bearer endpoints. Auto-updated when login or refresh succeeds."
        >
          <textarea
            value={session.accessToken}
            onChange={(event) =>
              onChange({
                ...session,
                accessToken: event.target.value,
              })
            }
            rows={4}
            placeholder="Paste JWT access token"
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
          />
        </Field>

        <Field
          label="Refresh token"
          hint="Proxy retries once on 401 by calling `/auth/refresh-token`."
        >
          <textarea
            value={session.refreshToken}
            onChange={(event) =>
              onChange({
                ...session,
                refreshToken: event.target.value,
              })
            }
            rows={4}
            placeholder="Paste JWT refresh token"
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
          />
        </Field>

        <Field
          label="Admin token cookie"
          hint="Applied as `adminToken` cookie for OTA and admin HTML routes."
        >
          <textarea
            value={session.adminToken}
            onChange={(event) =>
              onChange({
                ...session,
                adminToken: event.target.value,
              })
            }
            rows={3}
            placeholder="Paste adminToken for cookie-based routes"
            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
          />
        </Field>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <StatusPill
          label="Bearer"
          value={session.accessToken ? "Ready" : "Missing"}
          active={Boolean(session.accessToken)}
        />
        <StatusPill
          label="Admin cookie"
          value={session.adminToken ? "Ready" : "Missing"}
          active={Boolean(session.adminToken)}
        />
      </div>
    </section>
  );
}

function ConsolePanel({
  latestResult,
  downloadCount,
  totalOperations,
}: {
  latestResult: ConsoleResult | null;
  downloadCount: number;
  totalOperations: number;
}) {
  return (
    <section className="rounded-[32px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_20px_80px_rgba(110,81,41,0.08)] backdrop-blur-xl md:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Response console
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            Latest execution
          </h2>
        </div>
        <div className="rounded-2xl bg-slate-100 px-3 py-2 text-right text-[11px] uppercase tracking-[0.18em] text-slate-500">
          <div>{totalOperations} ops</div>
          <div>{downloadCount} downloads</div>
        </div>
      </div>

      {!latestResult ? (
        <div className="mt-6 rounded-[26px] border border-dashed border-slate-900/10 bg-slate-50 p-4 text-sm leading-7 text-slate-600">
          Execute any card to inspect raw payloads, HTML previews, streamed SSE
          events and downloaded attachments here.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-[26px] bg-slate-950 p-4 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="dark">{latestResult.method}</Badge>
              <Badge tone={latestResult.ok ? "success" : "danger"}>
                {latestResult.status}
              </Badge>
              <Badge tone="dark">{latestResult.mode}</Badge>
            </div>
            <p className="mt-3 text-sm font-semibold">{latestResult.operationLabel}</p>
            <p className="mt-2 break-all font-mono text-xs leading-6 text-white/65">
              {latestResult.targetUrl}
            </p>
            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/45">
              {latestResult.contentType || "Unknown content type"} ·{" "}
              {latestResult.durationMs.toFixed(0)}ms
            </p>
          </div>

          {latestResult.download ? (
            <a
              href={latestResult.download.url}
              download={latestResult.download.filename}
              className="inline-flex rounded-full bg-[#ed6f57] px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(237,111,87,0.22)]"
            >
              Download {latestResult.download.filename}
            </a>
          ) : null}

          <pre className="max-h-[480px] overflow-auto rounded-[26px] border border-slate-900/10 bg-[#f9f6f0] p-4 font-mono text-xs leading-6 text-slate-700">
            {latestResult.summary}
          </pre>
        </div>
      )}
    </section>
  );
}

function OverviewPanel({
  sections,
  totalOperations,
  sseCount,
  uploadCount,
  downloadCount,
  tabCounts,
  onGoToTab,
}: {
  sections: ApiSection[];
  totalOperations: number;
  sseCount: number;
  uploadCount: number;
  downloadCount: number;
  tabCounts: Record<Exclude<AppTabId, "overview">, number>;
  onGoToTab: (tab: Exclude<AppTabId, "overview">) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HighlightCard
          eyebrow="Surface"
          title={`${totalOperations} documented endpoints`}
          copy="Generated straight from the integration guide, then typed into a single explorer."
        />
        <HighlightCard
          eyebrow="Proxy"
          title="JWT refresh aware"
          copy="Bearer requests retry once on 401 by exchanging the refresh token through the backend."
        />
        <HighlightCard
          eyebrow="Realtime"
          title={`${sseCount} SSE streams`}
          copy="Comment stream endpoints can be inspected directly from the browser with live event parsing."
        />
        <HighlightCard
          eyebrow="Files"
          title={`${uploadCount} uploads · ${downloadCount} downloads`}
          copy="Multipart uploads and streamed file downloads are proxied without CORS leakage."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="rounded-[32px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_20px_80px_rgba(110,81,41,0.08)] backdrop-blur-xl md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Tab map
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {TAB_ITEMS.filter((tab) => tab.id !== "overview").map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onGoToTab(tab.id as Exclude<AppTabId, "overview">)}
                className="rounded-[26px] border border-slate-900/10 bg-[#fffaf4] p-4 text-left transition hover:border-[#ed6f57]/30 hover:bg-white"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-slate-950">
                    {tab.label}
                  </span>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    {tabCounts[tab.id as Exclude<AppTabId, "overview">]}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{tab.kicker}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-900/10 bg-[#10334b] p-5 text-white shadow-[0_24px_80px_rgba(16,51,75,0.18)] md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
            Included sections
          </p>
          <div className="mt-5 space-y-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className="rounded-[22px] border border-white/10 bg-white/6 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold">{section.title}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-white/55">
                    {section.operations.length} ops
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-white/68">
                  {section.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionPanel({
  section,
  session,
  onSessionPatch,
  onResult,
  defaultExpandedIndex,
}: {
  section: ApiSection;
  session: SessionSettings;
  onSessionPatch: (patch: Partial<SessionSettings>) => void;
  onResult: (result: ConsoleResult) => void;
  defaultExpandedIndex: number;
}) {
  return (
    <section className="rounded-[32px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_20px_80px_rgba(110,81,41,0.08)] backdrop-blur-xl md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {section.tab}
          </p>
          <h3 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
            {section.title}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            {section.description}
          </p>
        </div>
        <Badge tone="neutral">{section.operations.length} operations</Badge>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        {section.operations.map((operation, index) => (
          <OperationCard
            key={operation.id}
            operation={operation}
            session={session}
            onSessionPatch={onSessionPatch}
            onResult={onResult}
            defaultExpanded={index === defaultExpandedIndex}
          />
        ))}
      </div>
    </section>
  );
}

function OperationCard({
  operation,
  session,
  onSessionPatch,
  onResult,
  defaultExpanded = false,
}: OperationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [pathParams, setPathParams] = useState(operation.samplePathParams);
  const [queryText, setQueryText] = useState(toJsonText(operation.sampleQuery));
  const [bodyText, setBodyText] = useState(
    operation.bodyMode === "text"
      ? String(operation.sampleBody ?? "")
      : toJsonText(operation.sampleBody),
  );
  const [formText, setFormText] = useState(toJsonText(operation.sampleFormData));
  const [headersText, setHeadersText] = useState(
    toJsonText(operation.headersSample),
  );
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [running, setRunning] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  async function executeRequest() {
    if (!session.baseUrl.trim()) {
      onResult({
        operationId: operation.id,
        operationLabel: `${operation.method} ${operation.path}`,
        targetUrl: "Missing backend origin",
        status: 400,
        ok: false,
        method: operation.method,
        path: operation.path,
        mode: operation.responseMode,
        contentType: "application/json",
        durationMs: 0,
        summary: JSON.stringify(
          {
            success: false,
            message: "Please provide a backend origin before executing requests.",
          },
          null,
          2,
        ),
      });
      return;
    }

    const query = parseJsonRecord(queryText);
    const headersRecord = parseJsonRecord(headersText);
    const targetPath = injectPathParams(operation.path, pathParams);
    const targetUrl = buildProxyUrl(operation.scope, targetPath, query);

    setRunning(true);

    const startAt = performance.now();
    const headers = new Headers({
      "x-backend-base-url": session.baseUrl,
    });

    if (operation.responseMode === "sse") {
      headers.set("accept", "text/event-stream");
    }

    if (session.accessToken) {
      headers.set("x-access-token", session.accessToken);
    }

    if (session.refreshToken) {
      headers.set("x-refresh-token", session.refreshToken);
    }

    if (session.adminToken) {
      headers.set("x-admin-token", session.adminToken);
    }

    Object.entries(headersRecord).forEach(([key, value]) => {
      headers.set(key, String(value));
    });

    let body: BodyInit | undefined;

    if (operation.bodyMode === "json") {
      headers.set("content-type", "application/json");
      body = JSON.stringify(parseJsonValue(bodyText));
    } else if (operation.bodyMode === "text") {
      headers.set("content-type", "text/plain;charset=UTF-8");
      body = bodyText;
    } else if (operation.bodyMode === "form-data") {
      const formData = new FormData();
      const formFields = parseJsonRecord(formText);
      Object.entries(formFields).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      Object.entries(files).forEach(([field, entries]) => {
        entries.forEach((file) => {
          formData.append(field, file);
        });
      });
      body = formData;
    }

    try {
      if (operation.responseMode === "sse") {
        streamAbortRef.current?.abort();
        const controller = new AbortController();
        streamAbortRef.current = controller;
        setStreaming(true);

        const response = await fetch(targetUrl, {
          method: operation.method,
          headers,
          body,
          cache: "no-store",
          signal: controller.signal,
        });

        syncSessionFromHeaders(response.headers, onSessionPatch);
        if (!response.ok || !response.body) {
          const failureText = await response.text();
          onResult({
            operationId: operation.id,
            operationLabel: `${operation.method} ${operation.path}`,
            targetUrl,
            status: response.status,
            ok: false,
            method: operation.method,
            path: operation.path,
            mode: operation.responseMode,
            contentType: response.headers.get("content-type") ?? "text/plain",
            durationMs: performance.now() - startAt,
            summary: failureText || "SSE connection failed.",
          });
          return;
        }

        const events: string[] = [];
        await readEventStream(response, (event) => {
          const line = event.event
            ? `[${event.event}] ${event.data}`
            : event.data;
          events.push(line);
          if (events.length > 60) {
            events.shift();
          }
          onResult({
            operationId: operation.id,
            operationLabel: `${operation.method} ${operation.path}`,
            targetUrl,
            status: response.status,
            ok: true,
            method: operation.method,
            path: operation.path,
            mode: operation.responseMode,
            contentType: response.headers.get("content-type") ?? "text/event-stream",
            durationMs: performance.now() - startAt,
            summary: events.join("\n\n"),
          });
        });

        return;
      }

      const response = await fetch(targetUrl, {
        method: operation.method,
        headers,
        body,
        cache: "no-store",
      });

      syncSessionFromHeaders(response.headers, onSessionPatch);
      const durationMs = performance.now() - startAt;
      const contentType = response.headers.get("content-type") ?? "text/plain";
      const contentDisposition = response.headers.get("content-disposition") ?? "";

      if (
        operation.responseMode === "download" ||
        contentDisposition.toLowerCase().includes("attachment")
      ) {
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const filename = getDownloadFilename(contentDisposition, operation);

        onResult({
          operationId: operation.id,
          operationLabel: `${operation.method} ${operation.path}`,
          targetUrl,
          status: response.status,
          ok: response.ok,
          method: operation.method,
          path: operation.path,
          mode: "download",
          contentType,
          durationMs,
          summary: JSON.stringify(
            {
              filename,
              size: blob.size,
              status: response.status,
            },
            null,
            2,
          ),
          download: {
            url: downloadUrl,
            filename,
            size: blob.size,
          },
        });
        return;
      }

      if (contentType.includes("application/json")) {
        const json = await response.json();
        syncSessionFromPayload(operation, json, onSessionPatch);

        onResult({
          operationId: operation.id,
          operationLabel: `${operation.method} ${operation.path}`,
          targetUrl,
          status: response.status,
          ok: response.ok,
          method: operation.method,
          path: operation.path,
          mode: operation.responseMode,
          contentType,
          durationMs,
          summary: JSON.stringify(json, null, 2),
          payload: json,
        });
        return;
      }

      const text = await response.text();
      onResult({
        operationId: operation.id,
        operationLabel: `${operation.method} ${operation.path}`,
        targetUrl,
        status: response.status,
        ok: response.ok,
        method: operation.method,
        path: operation.path,
        mode: operation.responseMode,
        contentType,
        durationMs,
        summary: text || "Empty response body.",
        payload: text,
      });
    } catch (error) {
      onResult({
        operationId: operation.id,
        operationLabel: `${operation.method} ${operation.path}`,
        targetUrl,
        status: 0,
        ok: false,
        method: operation.method,
        path: operation.path,
        mode: operation.responseMode,
        contentType: "application/json",
        durationMs: performance.now() - startAt,
        summary: JSON.stringify(
          {
            success: false,
            message:
              error instanceof Error ? error.message : "Unexpected client error",
          },
          null,
          2,
        ),
      });
    } finally {
      setRunning(false);
      setStreaming(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-900/10 bg-[#fffaf4] shadow-[0_12px_40px_rgba(110,81,41,0.06)]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full flex-col gap-4 p-5 text-left transition hover:bg-white/90"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="dark">{operation.method}</Badge>
          <Badge tone={authTone(operation)}>{formatAuthLabel(operation.auth)}</Badge>
          <Badge tone="neutral">{operation.responseMode}</Badge>
          {operation.fileFields.length > 0 ? <Badge tone="neutral">upload</Badge> : null}
        </div>

        <div>
          <h4 className="break-all text-base font-semibold text-slate-950">
            {operation.path}
          </h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {operation.description}
          </p>
        </div>

        <div className="grid gap-3 text-xs text-slate-500 md:grid-cols-2">
          <div>
            <span className="font-semibold uppercase tracking-[0.18em] text-slate-400">
              Request
            </span>
            <p className="mt-1 break-words leading-6">{operation.requestHint}</p>
          </div>
          <div>
            <span className="font-semibold uppercase tracking-[0.18em] text-slate-400">
              Role
            </span>
            <p className="mt-1 break-words leading-6">{operation.role}</p>
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-slate-900/10 bg-white p-5">
          <div className="grid gap-4">
            {Object.keys(pathParams).length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(pathParams).map(([key, value]) => (
                  <label key={key} className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Path param · {key}
                    </span>
                    <input
                      value={value}
                      onChange={(event) =>
                        setPathParams((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                      className="h-11 rounded-2xl border border-slate-900/10 bg-white px-4 text-sm outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
                    />
                  </label>
                ))}
              </div>
            ) : null}

            <EditorField
              label="Query JSON"
              hint="Sent as search params. Empty object means no query string."
              value={queryText}
              onChange={setQueryText}
            />

            {operation.bodyMode === "json" ? (
              <EditorField
                label="Body JSON"
                hint="Sent as application/json."
                value={bodyText}
                onChange={setBodyText}
              />
            ) : null}

            {operation.bodyMode === "text" ? (
              <EditorField
                label="Plain text body"
                hint="Used for endpoints expecting a raw string payload."
                value={bodyText}
                onChange={setBodyText}
                rows={5}
              />
            ) : null}

            {operation.bodyMode === "form-data" ? (
              <>
                <EditorField
                  label="Form fields JSON"
                  hint="Non-file multipart fields. Leave `{}` if the endpoint only needs files."
                  value={formText}
                  onChange={setFormText}
                />
                <div className="grid gap-3 md:grid-cols-2">
                  {operation.fileFields.map((field) => (
                    <label
                      key={field.name}
                      className="flex flex-col gap-2 rounded-[24px] border border-slate-900/10 bg-[#f9f6f0] p-4"
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        File · {field.name}
                      </span>
                      <input
                        type="file"
                        accept={field.accept}
                        multiple={field.multiple}
                        onChange={(event) =>
                          setFiles((current) => ({
                            ...current,
                            [field.name]: Array.from(event.target.files ?? []),
                          }))
                        }
                        className="text-sm text-slate-700 file:mr-3 file:rounded-full file:border-0 file:bg-[#10334b] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                      />
                    </label>
                  ))}
                </div>
              </>
            ) : null}

            <EditorField
              label="Extra headers JSON"
              hint="Optional. Useful for custom webhook signatures and ad-hoc debugging."
              value={headersText}
              onChange={setHeadersText}
            />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={running}
                onClick={executeRequest}
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#10334b] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(16,51,75,0.16)] transition hover:bg-[#0b2638] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {running ? "Executing..." : operation.responseMode === "sse" ? "Start stream" : "Execute"}
              </button>

              {operation.responseMode === "sse" ? (
                <button
                  type="button"
                  onClick={() => {
                    streamAbortRef.current?.abort();
                    setStreaming(false);
                    setRunning(false);
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-900/10 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-900/20 hover:bg-slate-50"
                >
                  {streaming ? "Stop stream" : "Abort pending"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setQueryText(toJsonText(operation.sampleQuery));
                  setBodyText(
                    operation.bodyMode === "text"
                      ? String(operation.sampleBody ?? "")
                      : toJsonText(operation.sampleBody),
                  );
                  setFormText(toJsonText(operation.sampleFormData));
                  setHeadersText(toJsonText(operation.headersSample));
                  setPathParams(operation.samplePathParams);
                  setFiles({});
                }}
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-900/10 px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-900/20 hover:bg-slate-50"
              >
                Reset samples
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function EditorField({
  label,
  hint,
  value,
  onChange,
  rows = 7,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-[24px] border border-slate-900/10 bg-[#f9f6f0] px-4 py-3 font-mono text-xs leading-6 text-slate-700 outline-none transition focus:border-[#ed6f57] focus:ring-4 focus:ring-[#ed6f57]/15"
      />
      <span className="text-xs leading-5 text-slate-500">{hint}</span>
    </label>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <section className="rounded-[32px] border border-dashed border-slate-900/15 bg-white/75 p-8 text-center shadow-[0_20px_80px_rgba(110,81,41,0.08)] backdrop-blur-xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        No matches
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
        No endpoints matched “{search}”.
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Try searching for a path fragment like <code>/comments</code>, a role
        like <code>admin</code>, or an interaction mode like{" "}
        <code>multipart</code>.
      </p>
    </section>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[84px] rounded-[22px] border border-white/8 bg-white/6 px-4 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</div>
    </div>
  );
}

function HighlightCard({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <article className="rounded-[28px] border border-slate-900/10 bg-white/80 p-5 shadow-[0_20px_80px_rgba(110,81,41,0.08)] backdrop-blur-xl md:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{copy}</p>
    </article>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/68">
        {label}
      </span>
      {children}
      <span className="text-xs leading-5 text-white/45">{hint}</span>
    </label>
  );
}

function StatusPill({
  label,
  value,
  active,
}: {
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border px-4 py-3 ${
        active
          ? "border-[#ed6f57]/35 bg-[#ed6f57]/12 text-white"
          : "border-white/10 bg-white/6 text-white/70"
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-current/65">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold">{value}</div>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "dark" | "neutral" | "success" | "danger" | "warning";
}) {
  const styles: Record<typeof tone, string> = {
    dark: "bg-slate-950 text-white",
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    danger: "bg-rose-100 text-rose-800",
    warning: "bg-amber-100 text-amber-800",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

function matchesOperation(
  operation: ApiOperation,
  search: string,
  sectionTitle: string,
) {
  if (!search) {
    return true;
  }

  const haystack = [
    operation.method,
    operation.path,
    operation.role,
    operation.requestHint,
    operation.responseHint,
    operation.description,
    sectionTitle,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(search);
}

function getTabCounts(sections: ApiSection[]) {
  return sections.reduce<Record<Exclude<AppTabId, "overview">, number>>(
    (accumulator, section) => {
      accumulator[section.tab] += section.operations.length;
      return accumulator;
    },
    {
      identity: 0,
      live: 0,
      commerce: 0,
      platform: 0,
    },
  );
}

function authTone(operation: ApiOperation) {
  if (operation.auth === "public") {
    return "success" as const;
  }

  if (operation.auth === "admin-cookie") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function formatAuthLabel(auth: ApiOperation["auth"]) {
  if (auth === "public") {
    return "public";
  }

  if (auth === "admin-cookie") {
    return "admin cookie";
  }

  return "bearer";
}

function toJsonText(value: unknown): string {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as Record<string, unknown>).length === 0
  ) {
    return "{}";
  }

  if (value === undefined || value === null || value === "") {
    return "{}";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

function safelyParseSession(source: string): SessionSettings {
  try {
    return {
      ...DEFAULT_SESSION,
      ...(JSON.parse(source) as Partial<SessionSettings>),
    };
  } catch {
    return DEFAULT_SESSION;
  }
}

function parseJsonRecord(source: string): JsonRecord {
  const parsed = parseJsonValue(source);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  return parsed as JsonRecord;
}

function parseJsonValue(source: string): unknown {
  const trimmed = source.trim();
  if (!trimmed) {
    return {};
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return {};
  }
}

function injectPathParams(path: string, pathParams: Record<string, string>) {
  return Object.entries(pathParams).reduce((result, [key, value]) => {
    return result.replaceAll(`:${key}`, encodeURIComponent(value));
  }, path);
}

function buildProxyUrl(
  scope: ApiOperation["scope"],
  path: string,
  query: JsonRecord,
) {
  const normalizedPath = path === "/" ? "" : path;
  const url = new URL(
    `/api/proxy/${scope}${normalizedPath}`,
    window.location.origin,
  );

  Object.entries(query).forEach(([key, value]) => {
    if (value === "" || value === undefined || value === null) {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

function syncSessionFromHeaders(
  headers: Headers,
  onSessionPatch: (patch: Partial<SessionSettings>) => void,
) {
  const refreshedAccessToken = headers.get("x-refreshed-access-token");
  if (refreshedAccessToken) {
    onSessionPatch({
      accessToken: refreshedAccessToken,
    });
  }
}

function syncSessionFromPayload(
  operation: ApiOperation,
  payload: unknown,
  onSessionPatch: (patch: Partial<SessionSettings>) => void,
) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  const data = payload as {
    data?: {
      accessToken?: string;
      tokens?: {
        accessToken?: string;
        refreshToken?: string;
      };
    };
  };

  if (operation.path === "/auth/login" && data.data?.tokens) {
    onSessionPatch({
      accessToken: data.data.tokens.accessToken ?? "",
      refreshToken: data.data.tokens.refreshToken ?? "",
    });
  }

  if (operation.path === "/auth/refresh-token" && data.data?.accessToken) {
    onSessionPatch({
      accessToken: data.data.accessToken,
    });
  }

  if (operation.path === "/auth/logout") {
    onSessionPatch({
      accessToken: "",
      refreshToken: "",
    });
  }
}

function getDownloadFilename(contentDisposition: string, operation: ApiOperation) {
  const match =
    contentDisposition.match(/filename\*=UTF-8''([^;]+)/i) ??
    contentDisposition.match(/filename="?([^"]+)"?/i);

  if (match?.[1]) {
    return decodeURIComponent(match[1]);
  }

  if (operation.path.includes("excel")) {
    return "orders-export.xlsx";
  }

  return "download.bin";
}

async function readEventStream(
  response: Response,
  onEvent: (event: { event: string; data: string }) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";

    parts.forEach((part) => {
      const event = parseSseEvent(part);
      if (event.data) {
        onEvent(event);
      }
    });
  }
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
