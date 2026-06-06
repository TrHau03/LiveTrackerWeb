/**
 * Bank Service — Fetch banks list and save bank settings for shop.
 */
import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export interface Bank {
  bin: string;
  shortName: string;
  name: string;
  logo: string;
}

export interface BankSettingsRequest {
  bin: string;
  accountNo: string;
  accountName: string;
}

export async function fetchBanks(session: SessionSettings): Promise<{ ok: boolean; data?: Bank[]; response: Response }> {
  return proxyRequest(session, {
    path: "/users/banks",
  }) as any;
}

export async function saveBankSettings(
  session: SessionSettings,
  shopId: string,
  data: BankSettingsRequest,
) {
  return proxyRequest(session, {
    path: `/users/me/shops/${shopId}/bank-settings`,
    method: "POST",
    body: data,
  });
}

export async function updateShopInfo(
  session: SessionSettings,
  shopId: string,
  data: { phone: string; address: string },
) {
  return proxyRequest(session, {
    path: `/users/me/shops/${shopId}`,
    method: "PATCH",
    body: {
      shop: data
    },
  });
}
