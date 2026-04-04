import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface SettingsState {
  theme: "light" | "dark";
  language: "vi" | "en";
  autoReconnectSSE: boolean;
  paperSize: "80mm" | "58mm" | "a5";

  // Actions
  setTheme: (theme: "light" | "dark") => void;
  setLanguage: (lang: "vi" | "en") => void;
  setAutoReconnectSSE: (auto: boolean) => void;
  setPaperSize: (size: "80mm" | "58mm" | "a5") => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      language: "vi",
      autoReconnectSSE: true,
      paperSize: "80mm",

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setAutoReconnectSSE: (autoReconnectSSE) => set({ autoReconnectSSE }),
      setPaperSize: (paperSize) => set({ paperSize }),
    }),
    {
      name: "live-tracker-web.settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
