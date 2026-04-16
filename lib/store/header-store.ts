import { create } from "zustand";

export type HeaderAction = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  hidden?: boolean;
  className?: string;
};

export type HeaderState = {
  title: string | null;
  subtitle: string | null;
  showDateRange: boolean;
  startDate: string | null;
  endDate: string | null;
  onDateRangeChange: ((start: string, end: string) => void) | null;
  customContent: React.ReactNode | null;
  actions: HeaderAction[];
  
  // Actions
  setHeader: (config: Partial<Omit<HeaderState, "setHeader" | "resetHeader">>) => void;
  resetHeader: () => void;
};

export const useHeaderStore = create<HeaderState>((set) => ({
  title: null,
  subtitle: null,
  showDateRange: true,
  startDate: null,
  endDate: null,
  onDateRangeChange: null,
  customContent: null,
  actions: [],

  setHeader: (config) => set((state) => ({ ...state, ...config })),
  resetHeader: () => set({
    title: null,
    subtitle: null,
    showDateRange: true,
    startDate: null,
    endDate: null,
    onDateRangeChange: null,
    customContent: null,
    actions: [],
  }),
}));
