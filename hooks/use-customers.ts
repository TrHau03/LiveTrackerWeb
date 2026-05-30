/**
 * useCustomers — React Query hook cho danh sách khách hàng và chi tiết.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/components/session-provider";
import { fetchMyCustomers, fetchCustomerDetail, updateCustomerProfile } from "@/lib/services/customers-service";
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

export function useUpdateCustomerProfile() {
  const { logout, patchSession, session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, body }: { customerId: string; body: Record<string, unknown> }) => {
      const response = await updateCustomerProfile(session, customerId, body);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error("Cập nhật thông tin thất bại");
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer_detail", session.user?.id, variables.customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers", session.user?.id] });
    }
  });
}
