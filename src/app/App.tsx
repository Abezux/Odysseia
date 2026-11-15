import React, { useEffect, useState, Suspense } from 'react';
import { Layout } from './Layout';
import { TopBar } from '../features/dashboard/TopBar';
import { LeftSidebar } from '../features/dashboard/LeftSidebar';
import { RightUtilityColumn } from '../features/dashboard/RightUtilityColumn';
import { TimelineDock } from '../features/dashboard/TimelineDock';
import { LandingPage } from '../features/landing';
import { ToastContainer } from '../ui/Toast';
import { showToast } from '../ui/toastStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useUIStore } from '../store/useUIStore';
import { useScenarioStore } from '../store/useScenarioStore';
import { useTimeStore } from '../store/useTimeStore';
import { initializeUrlSync } from '../store/urlSync';
import { dataProvider } from '../lib/data';
import { evaluateMetricsAsync } from '../lib/workers/workerClient';
import type { Site, HorizonProfile, MetricsResult } from '../contracts';
import { safeViewTransition } from '../lib/viewTransition';

const CenterWorkspace = React.lazy(() =>
  import('../features/dashboard/CenterWorkspace').then((m) => ({ default: m.CenterWorkspace }))
);
const CompareView = React.lazy(() =>
  import('../features/compare').then((m) => ({ default: m.CompareView }))
);
const GuidedTour = React.lazy(() =>
  import('../features/tour').then((m) => ({ default: m.GuidedTour }))
);
const OnboardingTour = React.lazy(() =>
  import('../features/tour').then((m) => ({ default: m.OnboardingTour }))
);
const OnboardingInvite = React.lazy(() =>
  import('../features/tour').then((m) => ({ default: m.OnboardingInvite }))
);
const FeatureGuideModal = React.lazy(() =>
  import('../features/tour').then((m) => ({ default: m.FeatureGuideModal }))
);
const CustomSiteModal = React.lazy(() =>
  import('../features/sites/CustomSiteModal').then((m) => ({ default: m.CustomSiteModal }))
);
const ScorecardModal = React.lazy(() =>
  import('../features/detail/ScorecardModal').then((m) => ({ default: m.ScorecardModal }))
);

export default function App(): React.JSX.Element {
  const {
    view,
    setView,
    toggleMode,
    setActiveCenterTab,
    isCompareOpen,
    setCompareOpen,
    isTourOpen,
    setTourOpen,
    isOnboardingOpen,
    setOnboardingOpen,
    isFeatureGuideOpen,
    setFeatureGuideOpen
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

  // Check for ?tour=1 URL query parameter to launch onboarding directly
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tour') === '1') {
        if (view === 'landing') {
          setView('app');
        }
        setOnboardingOpen(true, 0);
      }
    }
  }, [view, setView, setOnboardingOpen]);

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

        // Emit authentic data provenance system notices into the Notification Center
        const simTimeStr = currentTime.toISOString().slice(11, 19) + ' UTC';
        if (horiz?.coverageStatus === 'PARTIAL') {
          useNotificationStore.getState().addNotification({
            type: 'system',
            severity: 'warning',
            title: 'LOLA 20M Horizon (Partial Coverage)',
            detail: `${currentSite.name} has ${horiz.realAzimuthBinPercent ?? 53}% authentic LOLA DEM coverage; remaining azimuths synthesized.`,
            simTime: simTimeStr,
            simTimestampMs: currentTime.getTime(),
            siteId: currentSite.id
          });
        } else if (horiz?.source === 'lola') {
          useNotificationStore.getState().addNotification({
            type: 'system',
            severity: 'info',
            title: 'LOLA 20M DEM Horizon Active',
            detail: `${currentSite.name} verified with 100% authentic LOLA polar DEM raycast.`,
            simTime: simTimeStr,
            simTimestampMs: currentTime.getTime(),
            siteId: currentSite.id
          });
        } else {
          useNotificationStore.getState().addNotification({
            type: 'system',
            severity: 'warning',
            title: 'Synthetic Horizon Profile',
            detail: `${currentSite.name} is outside LOLA 80°S DEM extent. Using synthetic terrain profile.`,
            simTime: simTimeStr,
            simTimestampMs: currentTime.getTime(),
            siteId: currentSite.id
          });
        }

        // Terrain system notice
        useNotificationStore.getState().addNotification({
          type: 'system',
          severity: 'info',
          title: 'Procedural 3D Terrain Active',
          detail: `${currentSite.name} local 3D surface mesh is procedurally synthesized.`,
          simTime: simTimeStr,
          simTimestampMs: currentTime.getTime(),
          siteId: currentSite.id
        });
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
          setFeatureGuideOpen(!isFeatureGuideOpen);
          break;
        case 'Escape':
          if (isCompareOpen) setCompareOpen(false);
          if (isScorecardOpen) setIsScorecardOpen(false);
          if (isCustomSiteOpen) setIsCustomSiteOpen(false);
          if (isFeatureGuideOpen) setFeatureGuideOpen(false);
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
    isFeatureGuideOpen,
    setFeatureGuideOpen,
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
              horizonCoverageStatus={horizon?.coverageStatus}
              realAzimuthPercent={horizon?.realAzimuthBinPercent}
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
            <Suspense fallback={<div className="h-full w-full bg-[#0B0A09]" />}>
              <CenterWorkspace metrics={metrics} activeSite={site} horizon={horizon} />
            </Suspense>
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
        <Suspense fallback={null}>
          <div className="fixed inset-0 z-50 flex bg-[#0B0A09]/90 backdrop-blur-md">
            <CompareView />
          </div>
        </Suspense>
      )}

      {/* Custom Site Coordinate Entry Modal */}
      {isCustomSiteOpen && (
        <Suspense fallback={null}>
          <CustomSiteModal
            isOpen={isCustomSiteOpen}
            onClose={() => setIsCustomSiteOpen(false)}
            onSubmit={handleAddCustomSite}
          />
        </Suspense>
      )}

      {/* Full Feasibility Scorecard Modal */}
      {isScorecardOpen && (
        <Suspense fallback={null}>
          <ScorecardModal
            isOpen={isScorecardOpen}
            onClose={() => setIsScorecardOpen(false)}
            site={site}
            metrics={metrics}
          />
        </Suspense>
      )}

      {/* Interactive Guided Tour Overlay (Legacy) */}
      {isTourOpen && (
        <Suspense fallback={null}>
          <GuidedTour />
        </Suspense>
      )}

      {/* Non-Blocking First-Run Onboarding Invite Card */}
      <Suspense fallback={null}>
        <OnboardingInvite />
      </Suspense>

      {/* Interactive 60-Second Onboarding Tour */}
      {isOnboardingOpen && (
        <Suspense fallback={null}>
          <OnboardingTour />
        </Suspense>
      )}

      {/* Comprehensive Feature Guide & Hotkeys Modal */}
      {isFeatureGuideOpen && (
        <Suspense fallback={null}>
          <FeatureGuideModal />
        </Suspense>
      )}

      {/* Industrial Dark Toast Container */}
      <ToastContainer />
    </div>
  );
}
