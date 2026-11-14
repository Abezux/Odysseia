import React, { useEffect, useState } from 'react';
import {
  Columns3,
  Clock,
  BarChart3,
  GitCompare,
  Calendar,
  Copy,
  Download,
  X
} from 'lucide-react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useUIStore } from '../../store/useUIStore';
import { dataProvider } from '../../lib/data';
import { evaluateMetricsAsync } from '../../lib/workers/workerClient';
import type { Site, HorizonProfile, MetricsResult } from '../../contracts';
import { Tabs, type TabItem } from '../../ui/Tabs';
import { CompareGrid } from './CompareGrid';
import { MultiTimeline } from './MultiTimeline';
import { MetricBarCompare } from './MetricBarCompare';
import { DeltaAnalysis } from './DeltaAnalysis';
import { DateSweepHeatmap } from './DateSweepHeatmap';
import { downloadComparisonCsv, copyComparisonMarkdown } from './exportUtils';
import { safeViewTransition } from '../../lib/viewTransition';
import { Icon } from '../../ui/Icon';

type CompareSubTab = 'grid' | 'timeline' | 'bars' | 'delta' | 'datesweep';

const compareTabs: TabItem[] = [
  { id: 'grid', label: 'Scenario Matrix', icon: <Icon icon={Columns3} size={16} /> },
  { id: 'timeline', label: 'Multi-Row Timeline', icon: <Icon icon={Clock} size={16} /> },
  { id: 'bars', label: 'Grouped Metric Bars', icon: <Icon icon={BarChart3} size={16} /> },
  { id: 'delta', label: 'Pairwise Delta Analysis', icon: <Icon icon={GitCompare} size={16} /> },
  { id: 'datesweep', label: 'Date-Sweep Heatmap', icon: <Icon icon={Calendar} size={16} /> }
];

export function CompareView(): React.JSX.Element {
  const { scenarios, addScenario } = useScenarioStore();
  const { setCompareOpen } = useUIStore();

  const [activeTab, setActiveTab] = useState<CompareSubTab>('grid');
  const [sites, setSites] = useState<Record<string, Site>>({});
  const [horizons, setHorizons] = useState<Record<string, HorizonProfile | null>>({});
  const [results, setResults] = useState<Record<string, MetricsResult>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Load catalog and scenario horizons
  useEffect(() => {
    let isCancelled = false;
    async function loadData() {
      setIsLoading(true);
      const cat = await dataProvider.getCatalog();
      const siteMap: Record<string, Site> = {};
      cat.sites.forEach((s) => {
        siteMap[s.id] = s;
      });

      const horizonMap: Record<string, HorizonProfile | null> = {};
      const resMap: Record<string, MetricsResult> = {};

      for (const sc of scenarios) {
        const h = await dataProvider.getHorizon(sc.siteId);
        horizonMap[sc.siteId] = h;

        const site = siteMap[sc.siteId];
        if (site) {
          const lat = sc.customCoordinates?.latDeg ?? site.latDeg;
          const lon = sc.customCoordinates?.lonDeg ?? site.lonDeg;
          const elev = site.elevationM;

          const res = await evaluateMetricsAsync({
            site: { latDeg: lat, lonDeg: lon, elevationM: elev },
            horizon: h,
            t: new Date(sc.landingTimeIso)
          });
          resMap[sc.id] = res;
        }
      }

      if (!isCancelled) {
        setSites(siteMap);
        setHorizons(horizonMap);
        setResults(resMap);
        setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isCancelled = true;
    };
  }, [scenarios]);

  const handleExportCsv = () => {
    downloadComparisonCsv(scenarios, results, sites);
  };

  const handleCopyMarkdown = async () => {
    const ok = await copyComparisonMarkdown(scenarios, results, sites);
    if (ok) {
      setCopyFeedback('Copied to Clipboard!');
      setTimeout(() => setCopyFeedback(null), 2500);
    }
  };

  const handleClose = () => {
    safeViewTransition(() => {
      setCompareOpen(false);
    });
  };

  const handleAddScenarioPrompt = () => {
    const siteKeys = Object.keys(sites);
    if (siteKeys.length === 0) return;
    const randomSite = sites[siteKeys[Math.floor(Math.random() * siteKeys.length)]];

    const colors = ['#F5A524', '#10B981', '#FFD58A', '#E8590C'];
    addScenario({
      id: crypto.randomUUID(),
      label: randomSite.name,
      siteId: randomSite.id,
      landingTimeIso: new Date().toISOString(),
      themeColor: colors[scenarios.length % colors.length]
    });
  };

  return (
    <div className="fixed inset-4 z-50 flex flex-col rounded-3xl glass-panel p-6 shadow-2xl overflow-hidden select-none border border-glass-border">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-panel-border pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber/15 text-amber font-mono font-bold">
            VS
          </div>
          <div>
            <h1 className="font-sans text-sm font-bold uppercase tracking-wider text-ink">
              Comparative Scenario Matrix
            </h1>
            <p className="font-mono text-[11px] text-muted">
              Side-by-side multi-site evaluation across synchronized ephemeris and LOLA terrain
            </p>
          </div>
          <span className="rounded-full bg-panel border border-panel-border px-3 py-1 font-mono text-[11px] text-amber">
            {scenarios.length} / 4 SLOTS
          </span>
        </div>

        {/* Sub-Tabs Pill */}
        <Tabs
          tabs={compareTabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as CompareSubTab)}
        />

        {/* Action Buttons: Export & Close */}
        <div className="flex items-center gap-2">
          {copyFeedback && (
            <span className="text-[11px] text-emerald font-mono animate-pulse">
              {copyFeedback}
            </span>
          )}
          <button
            type="button"
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel px-3 py-1.5 font-mono text-xs text-muted hover:text-ink hover:border-muted transition-colors"
          >
            <Icon icon={Copy} size={16} />
            <span>Copy MD</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel px-3 py-1.5 font-mono text-xs text-muted hover:text-ink hover:border-muted transition-colors"
          >
            <Icon icon={Download} size={16} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 rounded-lg bg-amber px-4 py-1.5 font-sans text-xs font-bold text-amber-text transition-colors hover:bg-amber-hover active:bg-amber-pressed"
          >
            <Icon icon={X} size={16} />
            <span>Close Matrix</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pt-4 space-y-4">
        {activeTab === 'grid' && (
          <CompareGrid
            scenarios={scenarios}
            results={results}
            sites={sites}
            isLoading={isLoading}
            onAddScenarioClick={handleAddScenarioPrompt}
          />
        )}

        {activeTab === 'timeline' && (
          <MultiTimeline scenarios={scenarios} sites={sites} horizons={horizons} />
        )}

        {activeTab === 'bars' && <MetricBarCompare scenarios={scenarios} results={results} />}

        {activeTab === 'delta' && (
          <DeltaAnalysis scenarios={scenarios} results={results} sites={sites} />
        )}

        {activeTab === 'datesweep' && (
          <DateSweepHeatmap
            sites={sites}
            horizons={horizons}
            defaultSiteId={scenarios[0]?.siteId}
          />
        )}
      </div>
    </div>
  );
}
