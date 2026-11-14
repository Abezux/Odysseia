import { create } from 'zustand';

export type DisplayMode = 'overview' | 'technical';
export type CenterTab = 'globe' | 'terrain' | 'horizon';

export interface UIState {
  mode: DisplayMode;
  activeCenterTab: CenterTab;
  isSidebarOpen: boolean;
  isCompareOpen: boolean;
  isTourOpen: boolean;
  setMode: (mode: DisplayMode) => void;
  toggleMode: () => void;
  setActiveCenterTab: (tab: CenterTab) => void;
  toggleSidebar: () => void;
  setCompareOpen: (open: boolean) => void;
  setTourOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  mode: 'overview',
  activeCenterTab: 'globe',
  isSidebarOpen: true,
  isCompareOpen: false,
  isTourOpen: false,

  setMode: (mode: DisplayMode) => set({ mode }),
  toggleMode: () =>
    set((state) => ({ mode: state.mode === 'overview' ? 'technical' : 'overview' })),
  setActiveCenterTab: (tab: CenterTab) => set({ activeCenterTab: tab }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setCompareOpen: (open: boolean) => set({ isCompareOpen: open }),
  setTourOpen: (open: boolean) => set({ isTourOpen: open })
}));
