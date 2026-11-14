import { useTimeStore } from './useTimeStore';
import { useScenarioStore } from './useScenarioStore';
import { useUIStore, type DisplayMode } from './useUIStore';

export function initializeUrlSync(): () => void {
  // Read on initial load or popstate/hashchange
  const parseLocation = () => {
    try {
      if (typeof window === 'undefined') return;

      const searchParams = new URLSearchParams(window.location.search);
      const hash = (window.location.hash || '').toLowerCase();
      const pathname = (window.location.pathname || '').toLowerCase();

      const cleanPath = pathname.replace(/\/$/, '');
      const isAppRequested =
        searchParams.get('view') === 'app' ||
        hash.includes('mission-control') ||
        hash.includes('app') ||
        cleanPath.endsWith('/mission-control') ||
        cleanPath.endsWith('/app');

      const isLandingRequested =
        searchParams.get('view') === 'landing' ||
        hash === '#landing' ||
        hash === '#/' ||
        hash === '';

      if (isAppRequested) {
        useUIStore.getState().setView('app');
      } else if (isLandingRequested && searchParams.get('view') === 'landing') {
        useUIStore.getState().setView('landing');
      }

      const site = searchParams.get('site');
      if (site) {
        useScenarioStore.getState().setActiveSiteId(site);
      }

      const t = searchParams.get('t');
      if (t) {
        const parsedDate = new Date(t);
        if (!isNaN(parsedDate.getTime())) {
          useTimeStore.getState().setTime(parsedDate);
        }
      }

      const mode = searchParams.get('mode');
      if (mode === 'overview' || mode === 'technical') {
        useUIStore.getState().setMode(mode as DisplayMode);
      }
    } catch (err) {
      console.warn('Failed to parse URL query/hash params:', err);
    }
  };

  parseLocation();

  // Listen for browser back/forward and hash changes
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', parseLocation);
    window.addEventListener('hashchange', parseLocation);
  }

  // Throttled URL state updater to avoid Chrome's 100-calls-per-30s history.replaceState limit
  let throttleTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingUpdate = false;

  const performUrlUpdate = () => {
    throttleTimer = null;
    try {
      if (typeof window === 'undefined' || typeof window.history === 'undefined') return;

      const view = useUIStore.getState().view;
      const siteId = useScenarioStore.getState().activeSiteId;
      const timeIso = useTimeStore.getState().currentTime.toISOString();
      const mode = useUIStore.getState().mode;

      const params = new URLSearchParams();
      if (view === 'app') params.set('view', 'app');
      if (siteId) params.set('site', siteId);
      params.set('t', timeIso);
      params.set('mode', mode);

      const hashPart = window.location.hash || '';
      const newUrl = `${window.location.pathname}?${params.toString()}${hashPart}`;

      window.history.replaceState(null, '', newUrl);
    } catch {
      // In non-browser, restricted iframe or throttled environments, fail silently
    }
  };

  const scheduleUpdateUrl = () => {
    if (throttleTimer !== null) {
      pendingUpdate = true;
      return;
    }

    performUrlUpdate();
    // Throttle to at most once every 600ms (max 50 calls in 30 seconds, well within Chrome's 100/30s cap)
    throttleTimer = setTimeout(() => {
      throttleTimer = null;
      if (pendingUpdate) {
        pendingUpdate = false;
        performUrlUpdate();
      }
    }, 600);
  };

  const unsubTime = useTimeStore.subscribe(scheduleUpdateUrl);
  const unsubScenario = useScenarioStore.subscribe(scheduleUpdateUrl);
  const unsubUI = useUIStore.subscribe(scheduleUpdateUrl);

  return () => {
    if (throttleTimer) clearTimeout(throttleTimer);
    if (typeof window !== 'undefined') {
      window.removeEventListener('popstate', parseLocation);
      window.removeEventListener('hashchange', parseLocation);
    }
    unsubTime();
    unsubScenario();
    unsubUI();
  };
}
