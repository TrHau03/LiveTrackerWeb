import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { fetchProvinces, fetchWards, Province, Ward } from "@/lib/services/provinces-service";
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
