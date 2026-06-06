/**
 * useBank — React Query hooks for managing banks and bank settings.
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { 
  fetchBanks, 
  saveBankSettings, 
  updateShopInfo,
  BankSettingsRequest,
  Bank 
} from "@/lib/services/bank-service";
import { extractApiData } from "@/lib/proxy-client";

export function useBanks() {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      const response = await fetchBanks(session);
      applyAuthResponses([response.response], patchSession, logout);
      return extractApiData<Bank[]>(response.data) || [];
    },
    enabled: !!session.accessToken,
    staleTime: 24 * 60 * 60 * 1000, // cache banks for 24h
  });
}

export function useSaveBankSettings() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ shopId, data }: { shopId: string; data: BankSettingsRequest }) => {
      const response = await saveBankSettings(session, shopId, data);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error((response.data as any)?.message || "Could not save bank settings");
      return response.data;
    },
  });
}

export function useUpdateShopInfo() {
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ shopId, data }: { shopId: string; data: { phone: string; address: string } }) => {
      const response = await updateShopInfo(session, shopId, data);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error((response.data as any)?.message || "Could not update shop info");
      return response.data;
    },
  });
}
