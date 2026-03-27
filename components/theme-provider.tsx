"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  isReady: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "live-tracker-web.theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const preferredDark =
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : preferredDark
          ? "dark"
          : "light";

    startTransition(() => {
      setThemeState(nextTheme);
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
  }, [isReady, theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isReady,
      theme,
      setTheme: (nextTheme) => setThemeState(nextTheme),
      toggleTheme: () => {
        setThemeState((current) => (current === "dark" ? "light" : "dark"));
      },
    }),
    [isReady, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
