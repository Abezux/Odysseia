import { create } from 'zustand';

export type DisplayMode = 'overview' | 'technical';
export type CenterTab = 'globe' | 'terrain' | 'horizon';
export type AppView = 'landing' | 'app';

export const ONBOARDING_VERSION = 'v1';
export const ONBOARDING_STORAGE_KEY = `odysseia_onboarding_seen_${ONBOARDING_VERSION}`;

function getInitialHasSeenOnboarding(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
    }
  } catch {
    // Graceful fallback for SSR/sandboxes
  }
  return false;
}

export interface UIState {
  view: AppView;
  mode: DisplayMode;
  activeCenterTab: CenterTab;
  isSidebarOpen: boolean;
  isCompareOpen: boolean;
  isTourOpen: boolean;
  isOnboardingOpen: boolean;
  isFeatureGuideOpen: boolean;
  onboardingStep: number;
  onboardingSingleStep: number | null;
  hasSeenOnboarding: boolean;
  setView: (view: AppView) => void;
  setMode: (mode: DisplayMode) => void;
  toggleMode: () => void;
  setActiveCenterTab: (tab: CenterTab) => void;
  toggleSidebar: () => void;
  setCompareOpen: (open: boolean) => void;
  setTourOpen: (open: boolean) => void;
  setOnboardingOpen: (open: boolean, startStep?: number, singleStep?: boolean) => void;
  setOnboardingStep: (step: number) => void;
  setFeatureGuideOpen: (open: boolean) => void;
  setHasSeenOnboarding: (seen: boolean) => void;
  resetOnboarding: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  view: 'landing',
  mode: 'overview',
  activeCenterTab: 'globe',
  isSidebarOpen: true,
  isCompareOpen: false,
  isTourOpen: false,
  isOnboardingOpen: false,
  isFeatureGuideOpen: false,
  onboardingStep: 0,
  onboardingSingleStep: null,
  hasSeenOnboarding: getInitialHasSeenOnboarding(),

  setView: (view: AppView) => set({ view }),
  setMode: (mode: DisplayMode) => set({ mode }),
  toggleMode: () =>
    set((state) => ({ mode: state.mode === 'overview' ? 'technical' : 'overview' })),
  setActiveCenterTab: (tab: CenterTab) => set({ activeCenterTab: tab }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setCompareOpen: (open: boolean) => set({ isCompareOpen: open }),
  setTourOpen: (open: boolean) => set({ isTourOpen: open }),
  setOnboardingOpen: (open: boolean, startStep = 0, singleStep = false) =>
    set({
      isOnboardingOpen: open,
      onboardingStep: startStep,
      onboardingSingleStep: singleStep ? startStep : null
    }),
  setOnboardingStep: (step: number) => set({ onboardingStep: step }),
  setFeatureGuideOpen: (open: boolean) => set({ isFeatureGuideOpen: open }),
  setHasSeenOnboarding: (seen: boolean) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, seen ? 'true' : 'false');
      }
    } catch {}
    set({ hasSeenOnboarding: seen });
  },
  resetOnboarding: () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      }
    } catch {}
    set({
      hasSeenOnboarding: false,
      isOnboardingOpen: true,
      onboardingStep: 0,
      onboardingSingleStep: null
    });
  }
}));
