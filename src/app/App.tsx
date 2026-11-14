import React, { useEffect, useState } from 'react';
import { Layout } from './Layout';
import { TopBar } from '../features/dashboard/TopBar';
import { LeftSidebar } from '../features/dashboard/LeftSidebar';
import { CenterWorkspace } from '../features/dashboard/CenterWorkspace';
import { RightUtilityColumn } from '../features/dashboard/RightUtilityColumn';
import { TimelineDock } from '../features/dashboard/TimelineDock';
import { CompareView } from '../features/compare';
import { GuidedTour } from '../features/tour';
import { LandingPage } from '../features/landing';
import { ToastContainer } from '../ui/Toast';
import { showToast } from '../ui/toastStore';
import { CustomSiteModal } from '../features/sites/CustomSiteModal';
import { ScorecardModal } from '../features/detail/ScorecardModal';
import { useUIStore } from '../store/useUIStore';
import { useScenarioStore } from '../store/useScenarioStore';
import { useTimeStore } from '../store/useTimeStore';
import { initializeUrlSync } from '../store/urlSync';
import { dataProvider } from '../lib/data';
import { evaluateMetricsAsync } from '../lib/workers/workerClient';
import type { Site, HorizonProfile, MetricsResult } from '../contracts';
import { safeViewTransition } from '../lib/viewTransition';

export default function App(): React.JSX.Element {
  const {
    view,
    setView,
    toggleMode,
    setActiveCenterTab,
    isCompareOpen,
    setCompareOpen,
    isTourOpen,
    setTourOpen
  } = useUIStore();

  const { activeSiteId, setActiveSiteId } = useScenarioStore();
  const { togglePlay, stepTime, currentTime } = useTimeStore();

  // Dashboard UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [isCustomSiteOpen, setIsCustomSiteOpen] = useState(false);

  // Active Site, Horizon & Live Evaluated Metrics
  const [site, setSite] = useState<Site | null>(null);
  const [horizon, setHorizon] = useState<HorizonProfile | null>(null);
  const [metrics, setMetrics] = useState<MetricsResult | null>(null);

  // Initialize URL Query Sync
  useEffect(() => {
    const cleanup = initializeUrlSync();
    return cleanup;
  }, []);

  // Fetch active site and horizon profile whenever activeSiteId changes
  useEffect(() => {
    let isCancelled = false;

    async function loadSiteData() {
      try {
        const cat = await dataProvider.getCatalog();
        const currentSite = cat.sites.find((s) => s.id === activeSiteId) || cat.sites[0];
        if (isCancelled) return;
        setSite(currentSite);

        const horiz = await dataProvider.getHorizon(currentSite.id);
        if (isCancelled) return;
        setHorizon(horiz);
      } catch (err) {
        console.error('[App] Failed to load site catalog or horizon:', err);
      }
    }

    loadSiteData();
    return () => {
      isCancelled = true;
    };
  }, [activeSiteId]);

  // Evaluate ephemeris & metrics whenever site, horizon or currentTime changes
  useEffect(() => {
    let isCancelled = false;
    if (!site) return;

    evaluateMetricsAsync({
      site: {
        latDeg: site.latDeg,
        lonDeg: site.lonDeg,
        elevationM: site.elevationM
      },
      horizon,
      t: currentTime
    })
      .then((res) => {
        if (!isCancelled) {
          setMetrics(res);
        }
      })
      .catch((err) => {
        console.error('[App] Metrics evaluation failed:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [site, horizon, currentTime]);

  // Handle adding custom coordinates site
  const handleAddCustomSite = async (custom: {
    name: string;
    latDeg: number;
    lonDeg: number;
    elevationM: number;
  }) => {
    const customId = `custom-${Date.now()}`;
    const customSite: Site = {
      id: customId,
      name: custom.name,
      agencyOrOperator: 'User Defined',
      category: 'custom',
      status: 'custom',
      latDeg: custom.latDeg,
      lonDeg: custom.lonDeg,
      elevationM: custom.elevationM,
      description: `Custom selenographic target at ${custom.latDeg.toFixed(2)}°, ${custom.lonDeg.toFixed(2)}°`,
      referenceUrl: 'https://moon.nasa.gov',
      isSouthPoleRegion: custom.latDeg <= -75,
      tags: ['custom', 'user-defined']
    };

    // Inject into dataProvider cache
    try {
      const cat = await dataProvider.getCatalog();
      cat.sites.unshift(customSite);
    } catch {
      // ignore
    }

    setSite(customSite);
    setHorizon(null);
    setActiveSiteId(customId);

    showToast({
      title: 'Custom Coordinates Created',
      subtitle: `${customSite.name} · ${customSite.latDeg.toFixed(2)}°, ${customSite.lonDeg.toFixed(2)}°`,
      severity: 'success'
    });
  };

  // Global keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          stepTime(e.shiftKey ? -86400 : -3600); // 1d with Shift, else 1h
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepTime(e.shiftKey ? 86400 : 3600);
          break;
        case '1':
          safeViewTransition(() => setActiveCenterTab('globe'));
          break;
        case '2':
          safeViewTransition(() => setActiveCenterTab('terrain'));
          break;
        case '3':
          safeViewTransition(() => setActiveCenterTab('horizon'));
          break;
        case 'm':
        case 'M':
          safeViewTransition(() => toggleMode());
          break;
        case 'c':
        case 'C':
          safeViewTransition(() => setCompareOpen(!isCompareOpen));
          break;
        case '?':
          setTourOpen(!isTourOpen);
          break;
        case 'Escape':
          if (isCompareOpen) setCompareOpen(false);
          if (isScorecardOpen) setIsScorecardOpen(false);
          if (isCustomSiteOpen) setIsCustomSiteOpen(false);
          if (isTourOpen) setTourOpen(false);
          if (isOpenMobile) setIsOpenMobile(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    stepTime,
    setActiveCenterTab,
    toggleMode,
    isCompareOpen,
    setCompareOpen,
    isScorecardOpen,
    isCustomSiteOpen,
    isTourOpen,
    setTourOpen,
    isOpenMobile
  ]);

  // Landing page view
  if (view === 'landing') {
    return <LandingPage onEnterApp={() => setView('app')} />;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B0A09]">
      <Layout
        slots={{
          TopBarSlot: (
            <TopBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onToggleMobileDrawer={() => setIsOpenMobile((v) => !v)}
              onOpenAlertsMobile={() => {}}
              onBackToLanding={() => setView('landing')}
              isRealLolaData={horizon?.source === 'lola'}
            />
          ),
          LeftSidebarSlot: (
            <LeftSidebar
              searchQuery={searchQuery}
              isOpenMobile={isOpenMobile}
              onCloseMobile={() => setIsOpenMobile(false)}
              onOpenCustomModal={() => setIsCustomSiteOpen(true)}
            />
          ),
          CenterViewSlot: (
            <CenterWorkspace metrics={metrics} activeSite={site} />
          ),
          RightDetailSlot: (
            <RightUtilityColumn
              site={site}
              horizon={horizon}
              metrics={metrics}
              onOpenScorecardModal={() => setIsScorecardOpen(true)}
            />
          ),
          BottomTimelineSlot: (
            <TimelineDock metrics={metrics} />
          )
        }}
      />

      {/* Full-Screen Comparison Matrix Overlay */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 flex bg-[#0B0A09]/90 backdrop-blur-md">
          <CompareView />
        </div>
      )}

      {/* Custom Site Coordinate Entry Modal */}
      <CustomSiteModal
        isOpen={isCustomSiteOpen}
        onClose={() => setIsCustomSiteOpen(false)}
        onSubmit={handleAddCustomSite}
      />

      {/* Full Feasibility Scorecard Modal */}
      <ScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        site={site}
        metrics={metrics}
      />

      {/* Interactive Guided Tour Overlay */}
      <GuidedTour />

      {/* Industrial Dark Toast Container */}
      <ToastContainer />
    </div>
  );
}
