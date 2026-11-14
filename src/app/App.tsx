import React, { useEffect } from 'react';
import { Layout } from './Layout';
import { TimeControlsBar } from '../features/time';
import { MoonGlobeView } from '../features/globe';
import { SiteBrowserView } from '../features/sites';
import { SiteDetailView } from '../features/detail';
import { TimelineStripView } from '../features/timeline';
import { TerrainView } from '../features/terrain';
import { HorizonView } from '../features/horizon';
import { CompareView } from '../features/compare';
import { GuidedTour } from '../features/tour';
import { Tabs, type TabItem } from '../ui/Tabs';
import { useUIStore, type CenterTab } from '../store/useUIStore';
import { useScenarioStore } from '../store/useScenarioStore';
import { useTimeStore } from '../store/useTimeStore';
import { initializeUrlSync } from '../store/urlSync';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const centerTabs: TabItem[] = [
  { id: 'globe', label: '🌐 3D Moon Globe' },
  { id: 'terrain', label: '🏔️ 3D Local Terrain' },
  { id: 'horizon', label: '🔭 Horizon Panorama' }
];

export default function App(): React.JSX.Element {
  const {
    mode,
    toggleMode,
    activeCenterTab,
    setActiveCenterTab,
    isCompareOpen,
    setCompareOpen,
    isTourOpen,
    setTourOpen
  } = useUIStore();

  const { scenarios } = useScenarioStore();
  const { togglePlay, stepTime } = useTimeStore();

  useEffect(() => {
    // Initialize two-way synchronization with URL query parameters
    const cleanup = initializeUrlSync();
    return cleanup;
  }, []);

  // Keyboard navigation shortcuts
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
          stepTime(e.shiftKey ? -86400 : -3600); // 1h or 1d with Shift
          break;
        case 'ArrowRight':
          e.preventDefault();
          stepTime(e.shiftKey ? 86400 : 3600);
          break;
        case '1':
          setActiveCenterTab('globe');
          break;
        case '2':
          setActiveCenterTab('terrain');
          break;
        case '3':
          setActiveCenterTab('horizon');
          break;
        case 'm':
        case 'M':
          toggleMode();
          break;
        case 'c':
        case 'C':
          setCompareOpen(!isCompareOpen);
          break;
        case '?':
          setTourOpen(!isTourOpen);
          break;
        case 'Escape':
          if (isCompareOpen) setCompareOpen(false);
          if (isTourOpen) setTourOpen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, stepTime, setActiveCenterTab, toggleMode, isCompareOpen, setCompareOpen, isTourOpen, setTourOpen]);

  const topBarContent = (
    <div className="flex w-full items-center justify-between gap-4">
      {/* Brand, Mode Toggle, Compare & Tour */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm font-bold tracking-wider text-sun-amber">
          LUNARSITE COMPARE
        </span>
        <Badge variant="neutral" size="sm">
          NASA SPACE APPS
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMode}
          title="Toggle between Overview (plain language) and Technical (frames & angles) [Shortcut: M]"
          className="text-xs font-mono"
        >
          {mode === 'overview' ? '⚡ Mode: Overview' : '🔬 Mode: Technical'}
        </Button>
        <Button
          variant={isCompareOpen ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setCompareOpen(!isCompareOpen)}
          title="Open Comparative Scenario Matrix [Shortcut: C]"
          className="text-xs font-mono"
        >
          📊 Compare ({scenarios.length})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTourOpen(true)}
          title="Interactive Mission Control Walkthrough [Shortcut: ?]"
          className="text-xs font-mono text-slate-300 hover:text-sun-amber"
        >
          🚀 Guide (?)
        </Button>
      </div>

      {/* Synchronized Time Controls */}
      <div className="flex-1 max-w-2xl">
        <TimeControlsBar />
      </div>
    </div>
  );

  const centerViewContent = (
    <div className="relative h-full w-full flex flex-col">
      {/* Tab Switcher Overlay */}
      <div className="absolute top-3 right-3 z-30">
        <Tabs
          tabs={centerTabs}
          activeTab={activeCenterTab}
          onChange={(id) => setActiveCenterTab(id as CenterTab)}
        />
      </div>

      {/* Viewport content */}
      <div className="flex-1 w-full h-full">
        {activeCenterTab === 'globe' && <MoonGlobeView />}
        {activeCenterTab === 'terrain' && <TerrainView />}
        {activeCenterTab === 'horizon' && <HorizonView />}
      </div>
    </div>
  );

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Layout
        slots={{
          TopBarSlot: topBarContent,
          LeftSidebarSlot: <SiteBrowserView />,
          CenterViewSlot: centerViewContent,
          RightDetailSlot: <SiteDetailView />,
          BottomTimelineSlot: <TimelineStripView />
        }}
      />

      {/* Full-Screen Comparison Matrix Overlay */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 flex bg-space-950/95 backdrop-blur-md">
          <CompareView />
        </div>
      )}

      {/* Interactive Guided Tour Overlay */}
      <GuidedTour />
    </div>
  );
}
