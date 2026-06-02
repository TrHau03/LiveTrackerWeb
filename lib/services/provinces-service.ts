import { proxyRequest } from "@/lib/proxy-client";
import type { SessionSettings } from "@/lib/workspace-session";

export interface Province {
  _id: string;
  code: string;
  name: string;
  slug: string;
  type: string;
  isCentral: boolean;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Ward {
  _id: string;
  code: string;
  name: string;
  fullName: string;
  slug: string;
  type: string;
  provinceCode: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchProvinces(session: SessionSettings) {
  const result = await proxyRequest<Province[]>(session, {
    path: "/provinces",
  });
  return result;
}

export async function fetchWards(session: SessionSettings, provinceCode: string) {
  const result = await proxyRequest<Ward[]>(session, {
    path: `/provinces/${provinceCode}/wards`,
  });
  return result;
}

export async function fetchOldProvinces(session: SessionSettings) {
  const result = await proxyRequest<Province[]>(session, {
    path: "/provinces/old-provinces",
  });
  return result;
}

export async function fetchOldDistricts(session: SessionSettings, parentCode: string) {
  const result = await proxyRequest<Ward[]>(session, {
    path: `/provinces/old-districts/${parentCode}`,
  });
  return result;
}

export async function fetchOldWards(session: SessionSettings, parentCode: string) {
  const result = await proxyRequest<Ward[]>(session, {
    path: `/provinces/old-wards/${parentCode}`,
  });
  return result;
}
