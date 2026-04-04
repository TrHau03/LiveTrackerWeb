/**
 * Shared TypeScript types for LiveTracker Web.
 * Derived from backend API DTOs (FE_API_INTEGRATION.md).
 */

// ─── Auth ────────────────────────────────────────────────────────────────────

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

// ─── Shop ────────────────────────────────────────────────────────────────────

export type Shop = {
  id?: string;
  name?: string;
  avatar?: string;
  phone?: string;
  address?: string;
  igUsername?: string;
  instagramUsername?: string;
};

// ─── Live ────────────────────────────────────────────────────────────────────

export type Live = {
  id: string;
  _id?: string;
  igLiveId: string;
  shopId?: string;
  userId?: string;
  isLive: boolean;
  totalComment: number;
  totalOrder: number;
  lastWebhookAt?: string;
  createdAt?: string;
  updatedAt?: string;
  shop?: Shop;
  user?: { fullName?: string; name?: string; username?: string; igUsername?: string };
};

// ─── Comment ─────────────────────────────────────────────────────────────────

export type Comment = {
  id: string;
  _id?: string;
  liveId?: string;
  text?: string;
  content?: string;
  message?: string;
  igUsername?: string;
  username?: string;
  igUserId?: string;
  quantity?: number;
  price?: number;
  createdAt?: string;
  updatedAt?: string;
  customerId?: string;
  customerTagId?: string;
};

// ─── Order ───────────────────────────────────────────────────────────────────

export type OrderItem = {
  productName?: string;
  quantity?: number;
  price?: number;
};

export type Order = {
  id: string;
  _id?: string;
  orderCode?: string;
  code?: string;
  igName?: string;
  customerName?: string;
  igId?: string;
  phone?: string;
  street?: string;
  ward?: string;
  province?: string;
  totalPrice?: number;
  amount?: number;
  deposit?: number;
  quantity?: number;
  liveId?: string;
  commentId?: string;
  commentIds?: string[];
  customerId?: string;
  actionType?: "NORMAL" | "BACKUP" | "CONFIRMED_ERROR";
  isNewCustomer?: boolean;
  items?: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
};

// ─── Customer ────────────────────────────────────────────────────────────────

export type Customer = {
  id: string;
  _id?: string;
  igName?: string;
  igId?: string;
  name?: string;
  phone?: string;
  dayOfBirth?: string;
  province?: string;
  ward?: string;
  street?: string;
  note?: string;
  userId?: string;
  tags?: Tag[];
  histories?: CustomerHistory[];
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerHistory = {
  id?: string;
  _id?: string;
  title?: string;
  action?: string;
  type?: string;
  note?: string;
  createdAt?: string;
};

// ─── Tag ─────────────────────────────────────────────────────────────────────

export type Tag = {
  id: string;
  _id?: string;
  label?: string;
  name?: string;
  color?: string;
};

// ─── Notification ────────────────────────────────────────────────────────────

export type Notification = {
  id: string;
  _id?: string;
  title?: string;
  message?: string;
  body?: string;
  content?: string;
  type?: string;
  isRead?: boolean;
  createdAt?: string;
};

// ─── Dashboard Metrics ───────────────────────────────────────────────────────

export type DashboardMetrics = {
  orders?: MetricBlock;
  comments?: MetricBlock;
  lives?: MetricBlock;
  customers?: MetricBlock;
};

export type MetricBlock = {
  total?: number;
  count?: number;
  value?: number;
  totalOrders?: number;
  totalComments?: number;
  totalLives?: number;
  totalCustomers?: number;
};

// ─── Subscription ────────────────────────────────────────────────────────────

export type Subscription = {
  type?: string;
  name?: string;
  maxOrders?: number;
  usedOrders?: number;
};

// ─── Print Template ──────────────────────────────────────────────────────────

export type PrintTemplate = {
  orderTemplate?: {
    shopInfo?: { name?: boolean; address?: boolean; phone?: boolean };
    customerInfo?: { address?: boolean; phone?: boolean };
    productInfo?: { productList?: boolean; totalAmount?: boolean };
  };
  commentTemplate?: {
    shopInfo?: { name?: boolean; address?: boolean; phone?: boolean };
    productInfo?: { product?: boolean; quantity?: boolean; price?: boolean };
  };
};

// ─── API Response Wrappers ───────────────────────────────────────────────────

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type PaginatedResponse<T> = ApiResponse<{
  items?: T[];
  docs?: T[];
  results?: T[];
  data?: T[];
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}>;

// ─── Query Params ────────────────────────────────────────────────────────────

export type PaginationQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type OrderQuery = PaginationQuery & {
  customerName?: string;
  phone?: string;
  orderCode?: string;
  hasDeposit?: boolean;
  fromDate?: string;
  toDate?: string;
  customerId?: string;
  liveId?: string;
};

export type LiveQuery = PaginationQuery & {
  userId?: string;
  shopId?: string;
  startDate?: string;
  endDate?: string;
};

export type MetricsQuery = {
  period?: "day" | "week" | "month" | "year";
  comparison?: "previous_period" | "previous_week" | "previous_month" | "previous_year" | "none";
  userId?: string;
  liveId?: string;
  startDate?: string;
  endDate?: string;
};

export type ExportOrdersQuery = {
  startDate: string;
  endDate: string;
  shopId?: string;
};
