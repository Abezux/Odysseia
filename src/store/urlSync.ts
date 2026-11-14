import { useTimeStore } from './useTimeStore';
import { useScenarioStore } from './useScenarioStore';
import { useUIStore, type DisplayMode } from './useUIStore';

export function initializeUrlSync(): () => void {
  // Read on initial load
  try {
    const params = new URLSearchParams(window.location.search);
    const site = params.get('site');
    const t = params.get('t');
    const mode = params.get('mode');

    if (site) {
      useScenarioStore.getState().setActiveSiteId(site);
    }
    if (t) {
      const parsedDate = new Date(t);
      if (!isNaN(parsedDate.getTime())) {
        useTimeStore.getState().setTime(parsedDate);
      }
    }
    if (mode === 'overview' || mode === 'technical') {
      useUIStore.getState().setMode(mode as DisplayMode);
    }
  } catch (err) {
    console.warn('Failed to parse URL query params:', err);
  }

  // Subscribe to store updates to keep URL in sync
  const updateUrl = () => {
    try {
      const siteId = useScenarioStore.getState().activeSiteId;
      const timeIso = useTimeStore.getState().currentTime.toISOString();
      const mode = useUIStore.getState().mode;

      const params = new URLSearchParams();
      if (siteId) params.set('site', siteId);
      params.set('t', timeIso);
      params.set('mode', mode);

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState(null, '', newUrl);
    } catch {
      // In non-browser / test environments, ignore
    }
  };

  const unsubTime = useTimeStore.subscribe(updateUrl);
  const unsubScenario = useScenarioStore.subscribe(updateUrl);
  const unsubUI = useUIStore.subscribe(updateUrl);

  return () => {
    unsubTime();
    unsubScenario();
    unsubUI();
  };
}
