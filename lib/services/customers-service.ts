/**
 * Customers Service — Fetch customers, detail, tags, update profile.
 */
import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export async function fetchMyCustomers(
  session: SessionSettings,
  query?: { page?: number; limit?: number; search?: string },
) {
  return proxyRequest(session, {
    path: "/customers/user/my-customers",
    query: {
      page: query?.page ?? 1,
      limit: query?.limit ?? 20,
      search: query?.search || undefined,
    },
  });
}

export async function fetchCustomerDetail(
  session: SessionSettings,
  customerId: string,
  includeHistories = true,
) {
  return proxyRequest(session, {
    path: `/customers/${customerId}`,
    query: { includeHistories },
  });
}

export async function updateCustomerProfile(
  session: SessionSettings,
  customerId: string,
  body: Record<string, unknown>,
) {
  return proxyRequest(session, {
    path: `/customers/${customerId}/profile`,
    method: "PATCH",
    body,
  });
}

export async function deleteCustomer(
  session: SessionSettings,
  customerId: string,
) {
  return proxyRequest(session, {
    path: `/customers/${customerId}`,
    method: "DELETE",
  });
}

export async function assignTagToCustomer(
  session: SessionSettings,
  customerId: string,
  tagId: string,
) {
  return proxyRequest(session, {
    path: `/customers/${customerId}/tags/${tagId}`,
    method: "POST",
  });
}

export async function removeTagFromCustomer(
  session: SessionSettings,
  customerId: string,
) {
  return proxyRequest(session, {
    path: `/customers/${customerId}/tags`,
    method: "DELETE",
  });
}
