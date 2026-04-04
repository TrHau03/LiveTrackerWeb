/**
 * useCustomers — React Query hook cho danh sách khách hàng và chi tiết.
 */
import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/components/session-provider";
import { fetchMyCustomers, fetchCustomerDetail } from "@/lib/services/customers-service";
import { applyAuthResponses } from "@/hooks/use-auth-sync";

export function useCustomers(search?: string) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["customers", session.user?.id, search],
    queryFn: async () => {
      const response = await fetchMyCustomers(session, {
        page: 1,
        limit: 20,
        search: search || undefined,
      });
      applyAuthResponses([response.response], patchSession, logout);
      return response.data;
    },
    enabled: !!session.accessToken,
  });
}

export function useCustomerDetail(customerId: string | null | undefined) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["customer_detail", session.user?.id, customerId],
    queryFn: async () => {
      const response = await fetchCustomerDetail(session, customerId!, true);
      applyAuthResponses([response.response], patchSession, logout);
      return response.data;
    },
    enabled: !!session.accessToken && !!customerId,
  });
}
