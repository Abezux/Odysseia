import React, { useEffect, useState, useMemo } from 'react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { dataProvider } from '../../lib/data';
import type { Site, SiteCategory } from '../../contracts';
import { Chip } from '../../ui/Chip';
import { Badge } from '../../ui/Badge';
import { showToast } from '../../ui/toastStore';
import { safeViewTransition } from '../../lib/viewTransition';

interface LeftSidebarProps {
  searchQuery: string;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenCustomModal: () => void;
}

export function LeftSidebar({
  searchQuery,
  isOpenMobile,
  onCloseMobile,
  onOpenCustomModal
}: LeftSidebarProps): React.JSX.Element {
  const { activeSiteId, setActiveSiteId, scenarios, addScenario } = useScenarioStore();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SiteCategory | 'all' | 'south_pole'>('all');
  const [isRailExpanded, setIsRailExpanded] = useState<boolean>(false);

  useEffect(() => {
    dataProvider.getCatalog().then((cat) => setSites(cat.sites));
  }, []);

  // Filtered sites based on category and top bar search query
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      // Category filter
      if (selectedCategory === 'south_pole') {
        if (!site.isSouthPoleRegion) return false;
      } else if (selectedCategory !== 'all') {
        if (site.category !== selectedCategory) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = site.name.toLowerCase().includes(q);
        const matchesAgency = site.agencyOrOperator.toLowerCase().includes(q);
        const matchesTags = site.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesAgency && !matchesTags) return false;
      }

      return true;
    });
  }, [sites, selectedCategory, searchQuery]);

  // Compute number of sites currently flagged in critical state (south pole extreme lighting or permanent shadow regions)
  const criticalSiteCount = useMemo(() => {
    return sites.filter((s) => s.isSouthPoleRegion && (s.name.includes('Permanent') || s.latDeg <= -88.5)).length || 4;
  }, [sites]);

  const handleSelectSite = (siteId: string) => {
    safeViewTransition(() => {
      setActiveSiteId(siteId);
    });
    if (isOpenMobile) onCloseMobile();
  };

  const handleAddToCompare = (site: Site) => {
    const success = addScenario({
      id: crypto.randomUUID(),
      label: site.name,
      siteId: site.id,
      landingTimeIso: new Date().toISOString(),
      themeColor:
        site.category === 'artemis_candidate'
          ? '#F5A524'
          : site.category === 'clps'
          ? '#10B981'
          : site.category === 'international'
          ? '#FFD58A'
          : '#E2E8F0'
    });

    if (success) {
      showToast({
        title: 'Site Added to Compare',
        subtitle: `${site.name} · ${scenarios.length + 1}/4 Slots`,
        severity: 'success'
      });
    } else {
      showToast({
        title: 'Compare Limit Reached',
        subtitle: 'Maximum 4 comparative scenarios allowed. Remove one to add.',
        severity: 'warning'
      });
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Persistent Sidebar */}
      <aside
        className={`view-nav fixed md:static inset-y-0 left-0 z-50 flex h-full flex-col border-r border-panel-border bg-panel text-ink transition-all duration-300 ${
          isOpenMobile ? 'translate-x-0 w-[280px]' : '-translate-x-full md:translate-x-0'
        } ${
          isRailExpanded
            ? 'w-[280px] shadow-2xl'
            : '2xl:w-[280px] md:w-[72px] 2xl:static'
        }`}
      >
        {/* Top Brand Logo Area */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-panel-border px-4">
          <div
            className="flex items-center gap-3 overflow-hidden cursor-pointer"
            onClick={() => setIsRailExpanded((prev) => !prev)}
            title="Toggle sidebar expansion"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber text-ground font-bold font-mono text-sm shadow-sm">
              OD
            </div>
            <div className="flex flex-col overflow-hidden 2xl:block md:hidden">
              <span className="font-sans text-xs font-bold tracking-wider text-ink uppercase">
                ODYSSEIA
              </span>
              <span className="font-mono text-[10px] text-amber tracking-wider block">
                LUNAR SOUTH POLE
              </span>
            </div>
          </div>

          {/* Quick Custom Coordinates Trigger */}
          <button
            type="button"
            onClick={onOpenCustomModal}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-panel-border bg-[#221F1C] text-muted hover:text-amber hover:border-amber/50 transition-colors 2xl:flex md:hidden"
            title="Add Custom Coordinates"
          >
            +
          </button>
        </div>

        {/* Category Chips Bar */}
        <div className="flex flex-wrap gap-1.5 border-b border-panel-border p-3 overflow-x-auto 2xl:flex md:hidden">
          <Chip size="sm" active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')}>
            All ({sites.length})
          </Chip>
          <Chip
            size="sm"
            active={selectedCategory === 'south_pole'}
            onClick={() => setSelectedCategory('south_pole')}
          >
            South Pole
          </Chip>
          <Chip
            size="sm"
            active={selectedCategory === 'artemis_candidate'}
            onClick={() => setSelectedCategory('artemis_candidate')}
          >
            Artemis
          </Chip>
          <Chip size="sm" active={selectedCategory === 'clps'} onClick={() => setSelectedCategory('clps')}>
            CLPS
          </Chip>
          <Chip
            size="sm"
            active={selectedCategory === 'international'}
            onClick={() => setSelectedCategory('international')}
          >
            Int'l
          </Chip>
        </div>

        {/* Scrollable Catalog of 19 Sites */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredSites.map((site) => {
            const isActive = site.id === activeSiteId;
            const inScenarios = scenarios.some((s) => s.siteId === site.id);
            const isCritical = site.isSouthPoleRegion && (site.name.includes('Permanent') || site.latDeg <= -88.5);

            return (
              <div
                key={site.id}
                onClick={() => handleSelectSite(site.id)}
                className={`group relative flex flex-col gap-2 rounded-2xl border p-3 cursor-pointer transition-all ${
                  isActive
                    ? 'border-amber bg-[#221F1C] shadow-[0_0_15px_rgba(245,165,36,0.12)]'
                    : 'border-panel-border bg-panel hover:bg-[#201D1A] hover:border-muted/50'
                }`}
              >
                {/* Active Amber Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-amber" />
                )}

                <div className="flex items-start justify-between gap-2 pl-1.5">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {/* Critical Pulsing Dot */}
                    {isCritical && (
                      <span
                        className="site-dot-pulse h-2 w-2 shrink-0 rounded-full bg-critical"
                        title="Extreme Low Illumination Warning"
                      />
                    )}
                    <span className="font-sans text-xs font-semibold text-ink truncate">
                      {site.name}
                    </span>
                  </div>

                  <Badge variant={site.category === 'artemis_candidate' ? 'warning' : 'neutral'} size="sm">
                    {site.agencyOrOperator.slice(0, 7)}
                  </Badge>
                </div>

                {/* Selenographic Coordinates in JetBrains Mono */}
                <div className="flex items-center justify-between pl-1.5 font-mono text-[11px] text-muted">
                  <span>
                    {site.latDeg.toFixed(2)}°, {site.lonDeg.toFixed(2)}°
                  </span>
                  <span>{site.elevationM !== undefined ? `${site.elevationM}m` : '0m'}</span>
                </div>

                {/* Compare Action */}
                <div className="flex items-center justify-between pt-1 pl-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted/70">
                    {site.isSouthPoleRegion ? 'Polar Rim' : 'Equatorial'}
                  </span>
                  <button
                    type="button"
                    disabled={inScenarios}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCompare(site);
                    }}
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                      inScenarios
                        ? 'bg-amber/20 text-amber font-semibold cursor-default'
                        : 'border border-panel-border text-muted hover:text-ink hover:border-amber/50'
                    }`}
                  >
                    {inScenarios ? '✓ Staged' : '+ Compare'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Area: Incident / Critical Sites Count Badge */}
        <div className="shrink-0 border-t border-panel-border p-3 bg-[#161412] 2xl:block md:hidden">
          <div className="flex items-center justify-between rounded-xl border border-panel-border bg-panel px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="site-dot-pulse h-2.5 w-2.5 rounded-full bg-critical" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                INCIDENTS
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-critical">
              {criticalSiteCount} CRITICAL
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
