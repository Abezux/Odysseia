import React, { useState } from 'react';
import {
  X,
  Compass,
  Globe,
  Layers,
  Mountain,
  Eye,
  Maximize2,
  Target,
  Plus,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Play,
  RotateCcw,
  Columns3,
  FileText,
  Sliders,
  Bell,
  Keyboard,
  ArrowRight,
  type LucideIcon
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';

interface FeatureItem {
  id: string;
  name: string;
  category: 'views' | 'sites' | 'telemetry' | 'timeline' | 'compare' | 'system';
  description: string;
  targetStepIndex: number;
  icon: LucideIcon;
}

const FEATURES: FeatureItem[] = [
  // Views
  {
    id: 'moon-globe',
    name: 'Interactive 3D Moon Globe',
    category: 'views',
    description: 'Global 3D Moon with NASA LROC 4K texture, live solar terminator shader, and celestial Sun & Earth vectors.',
    targetStepIndex: 0,
    icon: Globe
  },
  {
    id: 'view-tabs',
    name: 'Multi-Perspective Viewports',
    category: 'views',
    description: 'Seamless transitions between orbital Moon globe, 20m/px Local Terrain, and First-Person Skyline.',
    targetStepIndex: 1,
    icon: Layers
  },
  {
    id: 'local-terrain',
    name: 'Local 3D Terrain & Mast',
    category: 'views',
    description: 'Authentic 20m LOLA DEM mesh with adjustable slope exaggeration and lander mast tracking Earth.',
    targetStepIndex: 1,
    icon: Mountain
  },
  {
    id: 'horizon-skyline',
    name: 'First-Person Horizon Skyline',
    category: 'views',
    description: '360° panoramic horizon raycasts determining line-of-sight for the low polar Sun and Earth.',
    targetStepIndex: 2,
    icon: Compass
  },
  {
    id: 'layer-controls',
    name: 'Display Layer Toggles',
    category: 'views',
    description: 'Toggle visibility of orbit paths, celestial bodies, starfields, site pins, and coordinate grids.',
    targetStepIndex: 0,
    icon: Eye
  },
  {
    id: 'fullscreen-hud',
    name: 'Fullscreen HUD Mode',
    category: 'views',
    description: 'Maximized immersion with floating mission metadata, Topocentric Sky Dial, and compact timeline bar.',
    targetStepIndex: 0,
    icon: Maximize2
  },

  // Sites
  {
    id: 'site-browser',
    name: 'Landing Site Catalog',
    category: 'sites',
    description: '19 curated Artemis candidate regions, CLPS commercial targets, and heritage lunar sites.',
    targetStepIndex: 3,
    icon: Target
  },
  {
    id: 'custom-site',
    name: 'Custom Coordinates Builder',
    category: 'sites',
    description: 'Define any custom selenographic latitude, longitude, and elevation to evaluate on the fly.',
    targetStepIndex: 3,
    icon: Plus
  },
  {
    id: 'category-filters',
    name: 'Category Filtering',
    category: 'sites',
    description: 'Filter sites quickly by Artemis Candidate, CLPS Commercial, South Pole, or All.',
    targetStepIndex: 3,
    icon: Filter
  },

  // Telemetry
  {
    id: 'sky-dial',
    name: 'Topocentric Sky Dial',
    category: 'telemetry',
    description: '360° polar horizon projection displaying Sun and Earth azimuths against terrain clearance.',
    targetStepIndex: 4,
    icon: Compass
  },
  {
    id: 'mission-alerts',
    name: 'Mission Alerts Pipeline',
    category: 'telemetry',
    description: 'Automated warnings for impending sunset, DTE comms blackout, and optimal operational windows.',
    targetStepIndex: 4,
    icon: AlertTriangle
  },
  {
    id: 'scorecard',
    name: 'Feasibility Scorecards',
    category: 'telemetry',
    description: 'Quantitative ranking across sunlight hours, comms availability, slope risk, and thermal cycle.',
    targetStepIndex: 4,
    icon: CheckCircle2
  },

  // Timeline
  {
    id: 'timeline-dock',
    name: '29.53-Day Synodic Timeline',
    category: 'timeline',
    description: 'Full synodic month multi-track curves showing Sun and Earth elevation with illumination bands.',
    targetStepIndex: 5,
    icon: Calendar
  },
  {
    id: 'scrub-playback',
    name: 'Interactive Scrubbing & Speeds',
    category: 'timeline',
    description: 'Drag red timeline cursor, step by hours/days, and accelerate playback from 1x to 10,000x.',
    targetStepIndex: 5,
    icon: Play
  },
  {
    id: 'reset-now',
    name: 'Simulation Epoch Reset',
    category: 'timeline',
    description: 'Single-click reset synchronizing simulation time with the current real-world UTC timestamp.',
    targetStepIndex: 5,
    icon: RotateCcw
  },

  // Compare
  {
    id: 'compare-matrix',
    name: 'Scenario Comparison Matrix',
    category: 'compare',
    description: 'Compare up to 4 sites side by side with automated pairwise trade-off delta analysis.',
    targetStepIndex: 6,
    icon: Columns3
  },
  {
    id: 'date-sweep',
    name: '1-Year Date-Sweep Heatmap',
    category: 'compare',
    description: 'Scan 48 candidate epochs across 12 synodic cycles to find the optimal launch window.',
    targetStepIndex: 6,
    icon: Calendar
  },
  {
    id: 'report-export',
    name: 'Markdown & CSV Export',
    category: 'compare',
    description: 'Export structured client-side CSV datasets and formatted mission evaluation reports.',
    targetStepIndex: 6,
    icon: FileText
  },

  // System
  {
    id: 'mode-switch',
    name: 'Overview vs. Astrometric Mode',
    category: 'system',
    description: 'Switch between plain-language summaries and NASA technical astrometric coordinate frames.',
    targetStepIndex: 7,
    icon: Sliders
  },
  {
    id: 'notification-center',
    name: 'Notification Center',
    category: 'system',
    description: 'Deduplicated operational alert center with filter chips and timeline synchronization.',
    targetStepIndex: 7,
    icon: Bell
  }
];

const KEYBOARD_SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause simulation' },
  { key: 'Left / Right', desc: 'Step simulation -1h / +1h' },
  { key: 'Shift + Left/Right', desc: 'Step simulation -1 day / +1 day' },
  { key: '1 / 2 / 3', desc: 'Switch Viewport (Globe / Terrain / Skyline)' },
  { key: 'M', desc: 'Toggle Overview / Astrometric Mode' },
  { key: 'C', desc: 'Open Comparative Scenario Matrix' },
  { key: 'H', desc: 'Toggle Hide Details in Viewport' },
  { key: 'F', desc: 'Toggle Fullscreen Mode' },
  { key: '?', desc: 'Open Help & Mission Guide' },
  { key: 'Esc', desc: 'Close open dialogs or exit fullscreen' }
];

export function FeatureGuideModal(): React.JSX.Element | null {
  const { isFeatureGuideOpen, setFeatureGuideOpen, setOnboardingOpen } = useUIStore();
  const [activeTab, setActiveTab] = useState<'features' | 'shortcuts'>('features');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  if (!isFeatureGuideOpen) return null;

  const filteredFeatures = FEATURES.filter((f) => {
    if (selectedCategory === 'all') return true;
    return f.category === selectedCategory;
  });

  const handleShowMe = (stepIndex: number) => {
    setFeatureGuideOpen(false);
    setOnboardingOpen(true, stepIndex, true);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mission Control Feature Guide"
      className="fixed inset-0 z-modal flex items-center justify-center bg-black/80 p-4 backdrop-blur-md select-none animate-fadeIn font-sans text-ink"
    >
      <div className="glass-panel flex w-full max-w-3xl flex-col max-h-[85vh] rounded-3xl border border-panel-border bg-[#141210]/95 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-panel-border/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber/15 text-amber border border-amber/30">
              <Icon icon={Compass} size={18} />
            </div>
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber">
                ODYSSEIA MISSION CONTROL
              </div>
              <h2 className="text-base font-bold text-ink">Feature Guide & Reference</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher: Features | Shortcuts */}
            <div className="flex rounded-lg border border-panel-border bg-panel p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('features')}
                className={`rounded-md px-3 py-1 transition-all ${
                  activeTab === 'features'
                    ? 'bg-amber text-amber-text font-bold shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('shortcuts')}
                className={`rounded-md px-3 py-1 transition-all flex items-center gap-1 ${
                  activeTab === 'shortcuts'
                    ? 'bg-amber text-amber-text font-bold shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <Icon icon={Keyboard} size={16} />
                <span>Shortcuts</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFeatureGuideOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-panel-border bg-panel text-muted hover:text-ink hover:border-amber/40 transition-colors"
              title="Close guide (Esc)"
              aria-label="Close guide"
            >
              <Icon icon={X} size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'features' ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 px-6 py-3 border-b border-panel-border/60 overflow-x-auto text-xs shrink-0">
              {[
                { id: 'all', label: 'All Features' },
                { id: 'views', label: '3D Views' },
                { id: 'sites', label: 'Site Catalog' },
                { id: 'telemetry', label: 'Telemetry & Dial' },
                { id: 'timeline', label: 'Synodic Timeline' },
                { id: 'compare', label: 'Comparison' },
                { id: 'system', label: 'System & Modes' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-lg px-2.5 py-1 font-mono text-[11px] transition-colors whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-amber text-amber-text font-bold shadow-xs'
                      : 'border border-panel-border bg-panel/60 text-muted hover:text-ink'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-6 overflow-y-auto max-h-[calc(85vh-160px)]">
              {filteredFeatures.map((feat) => {
                const FeatIcon = feat.icon;
                return (
                  <div
                    key={feat.id}
                    className="flex flex-col justify-between rounded-2xl border border-panel-border bg-panel/70 p-4 transition-all hover:border-amber/40 hover:bg-[#1E1C1A]"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber/10 text-amber border border-amber/25 shrink-0">
                          <Icon icon={FeatIcon} size={16} />
                        </div>
                        <h4 className="text-xs font-bold text-ink leading-tight">
                          {feat.name}
                        </h4>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed line-clamp-3">
                        {feat.description}
                      </p>
                    </div>

                    <div className="pt-3 mt-2 border-t border-panel-border/40 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleShowMe(feat.targetStepIndex)}
                        className="text-[10px] h-6 px-2 text-amber border-amber/30 hover:border-amber flex items-center gap-1"
                      >
                        <span>Show me</span>
                        <Icon icon={ArrowRight} size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Keyboard Shortcuts View */
          <div className="p-6 overflow-y-auto space-y-4 max-h-[calc(85vh-120px)]">
            <div className="rounded-2xl border border-panel-border bg-panel/60 p-4 space-y-1">
              <h3 className="text-xs font-bold text-ink flex items-center gap-2">
                <Icon icon={Keyboard} size={16} className="text-amber" />
                <span>Mission Control Hotkeys</span>
              </h3>
              <p className="text-xs text-muted">
                Navigate the entire application without touching the mouse using standardized space telemetry hotkeys.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {KEYBOARD_SHORTCUTS.map((sc, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-panel-border bg-panel p-3"
                >
                  <span className="text-xs text-muted">{sc.desc}</span>
                  <kbd className="rounded-md border border-panel-border bg-[#100E0D] px-2 py-0.5 font-mono text-xs font-bold text-amber shadow-xs">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
