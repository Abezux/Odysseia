import React, { useEffect, useState } from 'react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useUIStore } from '../../store/useUIStore';
import { dataProvider } from '../../lib/data';
import { evaluateMetricsAsync } from '../../lib/workers/workerClient';
import type { Site, HorizonProfile, MetricsResult } from '../../contracts';
import { Button } from '../../ui/Button';
import { Tabs, type TabItem } from '../../ui/Tabs';
import { CompareGrid } from './CompareGrid';
import { MultiTimeline } from './MultiTimeline';
import { MetricBarCompare } from './MetricBarCompare';
import { DeltaAnalysis } from './DeltaAnalysis';
import { DateSweepHeatmap } from './DateSweepHeatmap';
import { downloadComparisonCsv, copyComparisonMarkdown } from './exportUtils';

type CompareSubTab = 'grid' | 'timeline' | 'bars' | 'delta' | 'datesweep';

const compareTabs: TabItem[] = [
  { id: 'grid', label: '📊 Scenario Matrix' },
  { id: 'timeline', label: '⏱️ Multi-Row Timeline' },
  { id: 'bars', label: '📈 Grouped Metric Bars' },
  { id: 'delta', label: '⚖️ Pairwise Delta Analysis' },
  { id: 'datesweep', label: '🗓️ Date-Sweep Heatmap' }
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

  const handleAddScenarioPrompt = () => {
    const siteKeys = Object.keys(sites);
    if (siteKeys.length === 0) return;
    const randomSite = sites[siteKeys[Math.floor(Math.random() * siteKeys.length)]];

    const colors = ['#F59E0B', '#38BDF8', '#10B981', '#A855F7'];
    const chosenColor = colors[scenarios.length % colors.length];

    addScenario({
      id: crypto.randomUUID(),
      label: `${randomSite.name} Alt`,
      siteId: randomSite.id,
      landingTimeIso: new Date().toISOString(),
      themeColor: chosenColor
    });
  };

  return (
    <div className="flex h-full w-full flex-col bg-space-950 font-sans text-slate-100 overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-space-800 bg-space-900/90 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-bold tracking-wider text-sun-amber">
            COMPARATIVE SCENARIO MATRIX
          </span>
          <span className="rounded bg-space-800 px-2 py-0.5 font-mono text-[11px] text-slate-300 border border-space-700">
            {scenarios.length} / 4 Scenarios
          </span>
        </div>

        {/* View Sub-Tabs */}
        <Tabs
          tabs={compareTabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as CompareSubTab)}
        />

        {/* Action Buttons: Export & Close */}
        <div className="flex items-center gap-2">
          {copyFeedback && (
            <span className="text-[11px] text-emerald-400 font-mono animate-pulse">
              {copyFeedback}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyMarkdown}
            title="Copy comparative summary table in Markdown format"
            className="text-[11px] font-mono h-7"
          >
            📋 Copy MD
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCsv}
            title="Export comparative scenario metrics to CSV file"
            className="text-[11px] font-mono h-7"
          >
            ⬇️ Export CSV
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setCompareOpen(false)}
            title="Return to primary mission control view"
            className="text-[11px] font-mono h-7 px-3"
          >
            ✕ Close Compare
          </Button>
        </div>
      </div>

      {/* Main Content View */}
      <div className="flex-1 overflow-y-auto p-4">
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
          <MultiTimeline
            scenarios={scenarios}
            sites={sites}
            horizons={horizons}
          />
        )}

        {activeTab === 'bars' && (
          <MetricBarCompare
            scenarios={scenarios}
            results={results}
          />
        )}

        {activeTab === 'delta' && (
          <DeltaAnalysis
            scenarios={scenarios}
            results={results}
            sites={sites}
          />
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
