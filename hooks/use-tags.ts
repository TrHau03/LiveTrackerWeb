/**
 * useTags — React Query hooks for managing system tags.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { applyAuthResponses } from "@/hooks/use-auth-sync";
import { 
  fetchMyTags, 
  createTag, 
  updateTag, 
  deleteTag,
  CreateTagDto,
  UpdateTagDto
} from "@/lib/services/tags-service";

export function useTags(query?: { page?: number; limit?: number }) {
  const { logout, patchSession, session } = useSession();

  return useQuery({
    queryKey: ["tags", session.user?.id, query?.page, query?.limit],
    queryFn: async () => {
      const response = await fetchMyTags(session, query);
      applyAuthResponses([response.response], patchSession, logout);
      return response.data;
    },
    enabled: !!session.accessToken,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async (body: CreateTagDto) => {
      const response = await createTag(session, body);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error((response.data as any)?.message || "Could not create tag");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async ({ tagId, body }: { tagId: string; body: UpdateTagDto }) => {
      const response = await updateTag(session, tagId, body);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error((response.data as any)?.message || "Could not update tag");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { logout, patchSession, session } = useSession();

  return useMutation({
    mutationFn: async (tagId: string) => {
      const response = await deleteTag(session, tagId);
      applyAuthResponses([response.response], patchSession, logout);
      if (!response.ok) throw new Error((response.data as any)?.message || "Could not delete tag");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
