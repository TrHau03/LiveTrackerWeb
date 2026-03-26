export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type ApiScope = "api" | "root";
export type ApiAuth = "public" | "bearer" | "admin-cookie";
export type ApiBodyMode = "none" | "json" | "form-data" | "text";
export type ApiResponseMode = "json" | "download" | "sse" | "html";
export type AppTabId =
  | "overview"
  | "identity"
  | "live"
  | "commerce"
  | "platform";

export interface ApiFileField {
  name: string;
  accept?: string;
  multiple?: boolean;
}

export interface ApiOperation {
  id: string;
  sectionId: string;
  sectionTitle: string;
  tab: Exclude<AppTabId, "overview">;
  method: HttpMethod;
  path: string;
  scope: ApiScope;
  auth: ApiAuth;
  role: string;
  description: string;
  requestHint: string;
  responseHint: string;
  bodyMode: ApiBodyMode;
  responseMode: ApiResponseMode;
  samplePathParams: Record<string, string>;
  sampleQuery: Record<string, string | number | boolean>;
  sampleBody: unknown;
  sampleFormData: Record<string, string | number | boolean>;
  fileFields: ApiFileField[];
  headersSample: Record<string, string>;
}

export interface ApiSection {
  id: string;
  title: string;
  tab: Exclude<AppTabId, "overview">;
  description: string;
  operations: ApiOperation[];
}

export interface ApiCatalog {
  sections: ApiSection[];
  totalOperations: number;
}

