import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { type AuthUser, DEFAULT_SESSION } from "@/lib/workspace-session";

interface AuthState {
  accessToken: string;
  refreshToken: string;
  user: AuthUser | null;
  status: "booting" | "unauthenticated" | "authenticated";

  // Actions
  setSession: (session: { accessToken: string; refreshToken: string; user: AuthUser | null }) => void;
  patchSession: (patch: Partial<{ accessToken: string; refreshToken: string; user: AuthUser | null }>) => void;
  logout: () => void;
  setStatus: (status: "booting" | "unauthenticated" | "authenticated") => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: DEFAULT_SESSION.accessToken,
      refreshToken: DEFAULT_SESSION.refreshToken,
      user: DEFAULT_SESSION.user,
      status: "booting", // Default is booting while Zustand loads the persisted state

      setSession: (session) =>
        set({
          ...session,
          status: "authenticated",
        }),
      
      patchSession: (patch) =>
        set((state) => ({
          ...state,
          ...patch,
          // If we patch a non-empty token, we assume auth is successful
          status:
            patch.accessToken || (state.accessToken && state.status !== "booting")
              ? "authenticated"
              : state.status,
        })),

      logout: () =>
        set({
          accessToken: "",
          refreshToken: "",
          user: null,
          status: "unauthenticated",
        }),

      setStatus: (status) => set({ status }),
    }),
    {
      name: "live-tracker-web.auth-session",
      storage: createJSONStorage(() => localStorage),
      // We don't want to persist the 'status' booting state, only tokens/user
      partialize: (state) => ({ 
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user
      }),
      onRehydrateStorage: () => (state) => {
        // Once state is rehydrated from localStorage, update the status
        if (state) {
            state.setStatus(state.accessToken ? "authenticated" : "unauthenticated");
        }
      },
    }
  )
);
