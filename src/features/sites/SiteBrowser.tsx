import React, { useEffect, useState, useMemo } from 'react';
import { useScenarioStore } from '../../store/useScenarioStore';
import { dataProvider } from '../../lib/data';
import type { Site, SiteCategory } from '../../contracts';
import { Chip } from '../../ui/Chip';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { CustomSiteModal } from './CustomSiteModal';

export function SiteBrowserView(): React.JSX.Element {
  const { activeSiteId, setActiveSiteId, scenarios, addScenario } = useScenarioStore();

  const [sites, setSites] = useState<Site[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SiteCategory | 'all' | 'south_pole'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    dataProvider.getCatalog().then((cat) => setSites(cat.sites));
  }, []);

  const filteredSites = useMemo(() => {
    return sites.filter((site) => {
      // Category filter
      if (selectedCategory === 'south_pole') {
        if (!site.isSouthPoleRegion) return false;
      } else if (selectedCategory !== 'all') {
        if (site.category !== selectedCategory) return false;
      }

      // Search query
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

  const handleAddCustomSite = (custom: {
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
      description: `Custom selenographic coordinates at ${custom.latDeg}°, ${custom.lonDeg}°`,
      referenceUrl: 'https://moon.nasa.gov',
      isSouthPoleRegion: custom.latDeg <= -75,
      tags: ['custom', 'user-defined']
    };

    setSites((prev) => [customSite, ...prev]);
    setActiveSiteId(customId);
  };

  const handleAddToCompare = (site: Site) => {
    const success = addScenario({
      id: crypto.randomUUID(),
      label: site.name,
      siteId: site.id,
      landingTimeIso: new Date().toISOString(),
      themeColor:
        site.category === 'artemis_candidate'
          ? '#F59E0B'
          : site.category === 'clps'
          ? '#10B981'
          : site.category === 'international'
          ? '#38BDF8'
          : '#E2E8F0'
    });
    if (!success) {
      alert('Maximum of 4 comparative scenarios reached. Remove a scenario before adding another.');
    }
  };

  return (
    <div className="flex h-full flex-col font-sans text-slate-200">
      {/* Search Bar & Custom Pin Button */}
      <div className="flex items-center gap-2 pb-3">
        <input
          type="search"
          placeholder="Search site, agency..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded border border-space-700 bg-space-950 px-2.5 py-1.5 font-mono text-xs text-slate-200 placeholder:text-slate-500 focus:border-sun-amber focus:outline-none"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          title="Input custom lat/lon coordinates"
        >
          + Custom
        </Button>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-1.5 pb-3 border-b border-space-800">
        <Chip
          size="sm"
          active={selectedCategory === 'all'}
          onClick={() => setSelectedCategory('all')}
        >
          All ({sites.length})
        </Chip>
        <Chip
          size="sm"
          active={selectedCategory === 'south_pole'}
          onClick={() => setSelectedCategory('south_pole')}
        >
          South Pole ({sites.filter((s) => s.isSouthPoleRegion).length})
        </Chip>
        <Chip
          size="sm"
          active={selectedCategory === 'artemis_candidate'}
          onClick={() => setSelectedCategory('artemis_candidate')}
        >
          Artemis
        </Chip>
        <Chip
          size="sm"
          active={selectedCategory === 'apollo'}
          onClick={() => setSelectedCategory('apollo')}
        >
          Apollo
        </Chip>
        <Chip
          size="sm"
          active={selectedCategory === 'clps'}
          onClick={() => setSelectedCategory('clps')}
        >
          CLPS
        </Chip>
        <Chip
          size="sm"
          active={selectedCategory === 'international'}
          onClick={() => setSelectedCategory('international')}
        >
          International
        </Chip>
      </div>

      {/* Sites List */}
      <div className="flex-1 overflow-y-auto space-y-2 pt-3 pr-1">
        {filteredSites.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No landing sites match your criteria.
          </div>
        ) : (
          filteredSites.map((site) => {
            const isActive = site.id === activeSiteId;
            const inScenarios = scenarios.some((s) => s.siteId === site.id);

            return (
              <div
                key={site.id}
                onClick={() => setActiveSiteId(site.id)}
                className={`flex flex-col gap-1.5 rounded-lg border p-2.5 transition-all cursor-pointer ${
                  isActive
                    ? 'border-sun-amber/60 bg-space-800/90 shadow-md shadow-sun-amber/5'
                    : 'border-space-800 bg-space-900/50 hover:bg-space-800/40 hover:border-space-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-100">{site.name}</span>
                  <Badge
                    variant={
                      site.category === 'artemis_candidate'
                        ? 'warning'
                        : site.category === 'clps'
                        ? 'success'
                        : site.category === 'international'
                        ? 'info'
                        : 'neutral'
                    }
                    size="sm"
                  >
                    {site.agencyOrOperator}
                  </Badge>
                </div>

                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                  <span>
                    {site.latDeg.toFixed(2)}°, {site.lonDeg.toFixed(2)}°
                  </span>
                  <span>{site.elevationM ? `${site.elevationM} m` : 'Datum'}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {site.isSouthPoleRegion ? 'Polar Region' : 'Equatorial/Mid'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={inScenarios}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCompare(site);
                    }}
                    title={inScenarios ? 'Already in comparison' : 'Add to Compare matrix'}
                  >
                    {inScenarios ? '✓ In Compare' : '+ Compare'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <CustomSiteModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddCustomSite}
      />
    </div>
  );
}
