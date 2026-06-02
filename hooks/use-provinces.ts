import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { fetchProvinces, fetchWards, fetchOldProvinces, fetchOldDistricts, fetchOldWards, Province, Ward } from "@/lib/services/provinces-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { extractApiData } from "@/lib/proxy-client";

export function useProvinces() {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["provinces"],
    queryFn: async () => {
      const response = await fetchProvinces(session);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Không thể tải danh sách Tỉnh/Thành");
      return extractApiData<Province[]>(response.data) || [];
    },
    enabled: !!session.accessToken,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useWards(provinceCode?: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["provinces", provinceCode, "wards"],
    queryFn: async () => {
      const response = await fetchWards(session, provinceCode!);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Không thể tải danh sách Quận/Huyện");
      return extractApiData<Ward[]>(response.data) || [];
    },
    enabled: !!session.accessToken && !!provinceCode,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useOldProvinces() {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["old-provinces"],
    queryFn: async () => {
      console.log("[useOldProvinces] Đang tải danh sách Tỉnh/Thành cũ...");
      const response = await fetchOldProvinces(session);
      console.log("[useOldProvinces] Phản hồi thô:", response);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) {
        console.error("[useOldProvinces] Tải thất bại, Status:", response.status);
        throw new Error("Không thể tải danh sách Tỉnh/Thành cũ");
      }
      const extracted = extractApiData<Province[]>(response.data);
      console.log("[useOldProvinces] Dữ liệu trích xuất:", extracted);
      return extracted || [];
    },
    enabled: !!session.accessToken,
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useOldDistricts(parentCode?: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["old-districts", parentCode],
    queryFn: async () => {
      console.log(`[useOldDistricts] Đang tải Quận/Huyện cho parentCode: ${parentCode}...`);
      const response = await fetchOldDistricts(session, parentCode!);
      console.log("[useOldDistricts] Phản hồi thô:", response);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) {
        console.error("[useOldDistricts] Tải thất bại, Status:", response.status);
        throw new Error("Không thể tải danh sách Quận/Huyện cũ");
      }
      const extracted = extractApiData<Ward[]>(response.data);
      console.log("[useOldDistricts] Dữ liệu trích xuất:", extracted);
      return extracted || [];
    },
    enabled: !!session.accessToken && !!parentCode,
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useOldWards(parentCode?: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["old-wards", parentCode],
    queryFn: async () => {
      console.log(`[useOldWards] Đang tải Phường/Xã cho parentCode: ${parentCode}...`);
      const response = await fetchOldWards(session, parentCode!);
      console.log("[useOldWards] Phản hồi thô:", response);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) {
        console.error("[useOldWards] Tải thất bại, Status:", response.status);
        throw new Error("Không thể tải danh sách Phường/Xã cũ");
      }
      const extracted = extractApiData<Ward[]>(response.data);
      console.log("[useOldWards] Dữ liệu trích xuất:", extracted);
      return extracted || [];
    },
    enabled: !!session.accessToken && !!parentCode,
    staleTime: 1000 * 60 * 60 * 24,
  });
}
