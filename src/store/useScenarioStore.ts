import { create } from 'zustand';
import type { Scenario } from '../contracts';
import { useNotificationStore } from './useNotificationStore';

export interface ScenarioState {
  activeSiteId: string;
  activeScenarioId: string;
  scenarios: Scenario[];
  setActiveSiteId: (siteId: string) => void;
  setActiveScenario: (id: string) => void;
  addScenario: (scenario: Scenario) => boolean;
  removeScenario: (id: string) => void;
  updateScenario: (id: string, partial: Partial<Scenario>) => void;
}

const defaultScenario: Scenario = {
  id: 'a0000000-0000-4000-8000-000000000001',
  label: 'Shackleton Baseline',
  siteId: 'shackleton-rim',
  landingTimeIso: '2026-11-14T12:00:00.000Z',
  themeColor: '#F59E0B'
};

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  activeSiteId: 'shackleton-rim',
  activeScenarioId: defaultScenario.id,
  scenarios: [defaultScenario],

  setActiveSiteId: (siteId: string) => {
    set((state) => {
      // Also update active scenario siteId if one exists
      const updatedScenarios = state.scenarios.map((s) =>
        s.id === state.activeScenarioId ? { ...s, siteId } : s
      );
      return { activeSiteId: siteId, scenarios: updatedScenarios };
    });
  },

  setActiveScenario: (id: string) => {
    const target = get().scenarios.find((s) => s.id === id);
    if (target) {
      set({ activeScenarioId: id, activeSiteId: target.siteId });
    }
  },

  addScenario: (scenario: Scenario) => {
    const current = get().scenarios;
    if (current.length >= 4) {
      return false; // Enforce maximum of 4 scenarios
    }
    set({
      scenarios: [...current, scenario],
      activeScenarioId: scenario.id,
      activeSiteId: scenario.siteId
    });
    return true;
  },

  removeScenario: (id: string) => {
    const current = get().scenarios;
    if (current.length <= 1) return; // Keep at least one scenario
    const target = current.find((s) => s.id === id);
    const filtered = current.filter((s) => s.id !== id);
    const newActive = filtered[0].id;
    set({
      scenarios: filtered,
      activeScenarioId: newActive,
      activeSiteId: filtered[0].siteId
    });

    if (target) {
      try {
        useNotificationStore.getState().addNotification({
          type: 'user',
          severity: 'info',
          title: 'Removed from Compare',
          detail: `${target.label} removed from comparative scenario matrix.`,
          simTime: new Date().toISOString().slice(11, 19) + ' UTC',
          siteId: target.siteId
        });
      } catch {
        // Ignore during test/ssr
      }
    }
  },

  updateScenario: (id: string, partial: Partial<Scenario>) => {
    set((state) => ({
      scenarios: state.scenarios.map((s) => (s.id === id ? { ...s, ...partial } : s)),
      activeSiteId:
        state.activeScenarioId === id && partial.siteId ? partial.siteId : state.activeSiteId
    }));
  }
}));
