import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Plus,
  Check,
  AlertTriangle
} from 'lucide-react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { dataProvider } from '../../lib/data';
import type { Site, SiteCategory } from '../../contracts';
import { Chip } from '../../ui/Chip';
import { Badge } from '../../ui/Badge';
import { showToast } from '../../ui/toastStore';
import { safeViewTransition } from '../../lib/viewTransition';
import { Icon } from '../../ui/Icon';

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

  // Desktop sidebar expansion state with localStorage persistence
  const [isManualExpanded, setIsManualExpanded] = useState<boolean | null>(() => {
    try {
      const stored = localStorage.getItem('lunar_sidebar_expanded');
      return stored !== null ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const sidebarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    dataProvider.getCatalog().then((cat) => setSites(cat.sites));
  }, []);

  const toggleSidebar = () => {
    setIsManualExpanded((prev) => {
      const current = prev !== null ? prev : typeof window !== 'undefined' && window.innerWidth >= 1536;
      const next = !current;
      try {
        localStorage.setItem('lunar_sidebar_expanded', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keyboard shortcut [ to toggle sidebar (ignored while typing)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === '[') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Filtered sites based on category and top bar search query
  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      if (selectedCategory === 'south_pole') {
        if (!site.isSouthPoleRegion) return false;
      } else if (selectedCategory !== 'all') {
        if (site.category !== selectedCategory) return false;
      }

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

  const criticalSiteCount = useMemo(() => {
    return (
      sites.filter(
        (s) => s.isSouthPoleRegion && (s.name.includes('Permanent') || s.latDeg <= -88.5)
      ).length || 4
    );
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

  const getSiteInitials = (name: string): string => {
    const clean = name.replace(/Crater|Ridge|Massif|Rim|Plateau/gi, '').trim();
    const parts = (clean || name).split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Determine width class
  // Under 820px (mobile): drawer behavior with translate-x
  // 820px and wider (desktop): respects isManualExpanded, default 2xl:w-[280px] xl:w-[72px]
  const isExpandedDesktop = isManualExpanded !== null ? isManualExpanded : null;
  const desktopWidthClass =
    isExpandedDesktop === true
      ? 'md:w-[280px]'
      : isExpandedDesktop === false
      ? 'md:w-[72px]'
      : '2xl:w-[280px] md:w-[72px]';

  const isCurrentExpanded =
    isOpenMobile || (isExpandedDesktop === true);

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
        ref={sidebarRef}
        id="main-sidebar"
        data-tour="site-browser"
        aria-label="Landing site catalog"
        className={`view-nav fixed md:static inset-y-0 left-0 z-50 flex h-full flex-col border-r border-panel-border bg-panel text-ink transition-all duration-300 ${
          isOpenMobile ? 'translate-x-0 w-[280px]' : '-translate-x-full md:translate-x-0'
        } ${desktopWidthClass}`}
      >
        {/* Top Header: Brand Title (if expanded) + Controls */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-panel-border px-3.5 ${
            isExpandedDesktop === false ? 'justify-center' : 'justify-between'
          }`}
        >
          <div
            className={`flex items-center gap-2.5 overflow-hidden ${
              isExpandedDesktop === false
                ? 'hidden'
                : isExpandedDesktop === true
                ? 'flex'
                : 'hidden 2xl:flex'
            }`}
          >
            {/* Brand Title (hidden in collapsed rail mode) */}
            <div className="flex flex-col overflow-hidden">
              <span className="font-sans text-xs font-bold tracking-wider text-ink uppercase">
                ODYSSEIA
              </span>
              <span className="font-mono text-[10px] text-amber tracking-wider block">
                LUNAR SOUTH POLE
              </span>
            </div>
          </div>

          {/* Right Header Controls: Expand/Collapse Toggle & Custom Site */}
          <div className="flex items-center gap-1.5">
            {/* Custom Coordinates Trigger (expanded desktop or mobile) */}
            <button
              type="button"
              onClick={onOpenCustomModal}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border border-panel-border bg-[#221F1C] text-muted hover:text-amber hover:border-amber/50 transition-colors ${
                isExpandedDesktop === false
                  ? 'hidden'
                  : isExpandedDesktop === true
                  ? 'flex'
                  : 'hidden 2xl:flex'
              }`}
              title="Add Custom Coordinates"
              aria-label="Add custom coordinates"
            >
              <Icon icon={Plus} size={16} />
            </button>

            {/* Desktop Expand / Collapse Toggle Button */}
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={isCurrentExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={isCurrentExpanded}
              aria-controls="main-sidebar"
              title={isCurrentExpanded ? 'Collapse sidebar ([)' : 'Expand sidebar ([)'}
              className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-panel-border bg-[#221F1C] text-muted hover:text-ink hover:border-muted transition-colors focus:outline-none"
            >
              <Icon
                icon={isCurrentExpanded ? PanelLeftClose : PanelLeftOpen}
                size={16}
              />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* COLLAPSED RAIL VIEW (visible when width is 72px)         */}
        {/* ======================================================== */}
        <div
          className={`flex-1 flex-col items-center py-3 space-y-2 overflow-y-auto ${
            isExpandedDesktop === false
              ? 'flex'
              : isExpandedDesktop === true
              ? 'hidden'
              : 'flex 2xl:hidden'
          }`}
        >
          {/* Quick Search Trigger Icon */}
          <button
            type="button"
            onClick={() => {
              toggleSidebar();
              setTimeout(() => {
                const searchEl = document.querySelector('input[type="search"]') as HTMLInputElement;
                searchEl?.focus();
              }, 150);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-panel-border bg-[#1C1A17] text-muted hover:text-ink hover:border-amber/50 transition-colors"
            title="Search landing sites"
            aria-label="Search landing sites"
          >
            <Icon icon={Search} size={16} />
          </button>

          {/* Quick Custom Coordinates Icon */}
          <button
            type="button"
            onClick={onOpenCustomModal}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-panel-border bg-[#1C1A17] text-muted hover:text-amber hover:border-amber/50 transition-colors"
            title="Add Custom Coordinates"
            aria-label="Add Custom Coordinates"
          >
            <Icon icon={Plus} size={16} />
          </button>

          <div className="w-8 border-b border-panel-border my-1" />

          {/* Compact Site Tiles */}
          <div className="w-full flex flex-col items-center gap-1.5 px-2">
            {filteredSites.map((site, idx) => {
              const isActive = site.id === activeSiteId;
              const inScenarios = scenarios.some((s) => s.siteId === site.id);
              const isCritical =
                site.isSouthPoleRegion && (site.name.includes('Permanent') || site.latDeg <= -88.5);
              const initials = getSiteInitials(site.name);

              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => handleSelectSite(site.id)}
                  title={`${idx + 1}. ${site.name} (${site.latDeg.toFixed(2)}°, ${site.lonDeg.toFixed(2)}°)`}
                  aria-label={site.name}
                  className={`group relative flex h-10 w-10 flex-col items-center justify-center rounded-xl border transition-all ${
                    isActive
                      ? 'border-amber bg-amber/15 text-amber shadow-[0_0_12px_rgba(245,165,36,0.25)]'
                      : 'border-panel-border bg-[#1A1816] text-muted hover:text-ink hover:border-muted'
                  }`}
                >
                  {/* Left Indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-amber" />
                  )}

                  {/* Initials in mono */}
                  <span className="font-mono text-[11px] font-bold tracking-tight">
                    {initials}
                  </span>

                  {/* Badges/Indicators */}
                  <div className="absolute top-1 right-1 flex items-center gap-0.5">
                    {isCritical && (
                      <span className="site-dot-pulse h-1.5 w-1.5 rounded-full bg-critical" />
                    )}
                    {inScenarios && (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber" title="Added to compare" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* EXPANDED FULL SIDEBAR VIEW (visible when width is 280px)  */}
        {/* ======================================================== */}
        <div
          className={`flex-1 flex-col overflow-hidden ${
            isExpandedDesktop === false
              ? 'hidden'
              : isExpandedDesktop === true
              ? 'flex'
              : 'hidden 2xl:flex'
          }`}
        >
          {/* Category Chips Bar: Text Only (Mono Uppercase) */}
          <div className="flex flex-wrap gap-1.5 border-b border-panel-border p-3 overflow-x-auto">
            <Chip size="sm" active={selectedCategory === 'all'} onClick={() => setSelectedCategory('all')}>
              ALL ({sites.length})
            </Chip>
            <Chip
              size="sm"
              active={selectedCategory === 'south_pole'}
              onClick={() => setSelectedCategory('south_pole')}
            >
              SOUTH POLE
            </Chip>
            <Chip
              size="sm"
              active={selectedCategory === 'artemis_candidate'}
              onClick={() => setSelectedCategory('artemis_candidate')}
            >
              ARTEMIS
            </Chip>
            <Chip size="sm" active={selectedCategory === 'clps'} onClick={() => setSelectedCategory('clps')}>
              CLPS
            </Chip>
            <Chip
              size="sm"
              active={selectedCategory === 'international'}
              onClick={() => setSelectedCategory('international')}
            >
              INT'L
            </Chip>
          </div>

          {/* Scrollable Catalog of 19 Sites */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredSites.map((site) => {
              const isActive = site.id === activeSiteId;
              const inScenarios = scenarios.some((s) => s.siteId === site.id);
              const isCritical =
                site.isSouthPoleRegion && (site.name.includes('Permanent') || site.latDeg <= -88.5);

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
                      {site.isSouthPoleRegion ? 'POLAR RIM' : 'EQUATORIAL'}
                    </span>
                    <button
                      type="button"
                      disabled={inScenarios}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCompare(site);
                      }}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                        inScenarios
                          ? 'bg-amber/20 text-amber font-semibold cursor-default'
                          : 'border border-panel-border text-muted hover:text-ink hover:border-amber/50'
                      }`}
                    >
                      <Icon icon={inScenarios ? Check : Plus} size={16} />
                      <span>{inScenarios ? 'Staged' : 'Compare'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Area: Incident / Critical Sites Count Badge */}
          <div className="shrink-0 border-t border-panel-border p-3 bg-[#161412]">
            <div className="flex items-center justify-between rounded-xl border border-panel-border bg-panel px-3 py-2">
              <div className="flex items-center gap-2">
                <Icon icon={AlertTriangle} size={16} className="text-critical shrink-0" />
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                  INCIDENTS
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-critical">
                {criticalSiteCount} CRITICAL
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
