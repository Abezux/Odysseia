import React, { useState } from 'react';
import { X, Rocket, ChevronRight, ChevronLeft, Compass } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Icon } from '../../ui';

interface TourStep {
  title: string;
  badge: string;
  content: string;
  keyTakeaways: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Missions to the Moon's South Pole",
    badge: 'NASA Challenge Context',
    content:
      "NASA's Commercial Lunar Payload Services (CLPS) and Artemis missions target the lunar south pole for vital water ice and volatiles. However, landing sites face extreme operational constraints: the Sun never rises more than ~1.5° to 3° above the horizon, and crater rims cast massive shadows. Simultaneously, Earth wobbles on the horizon due to optical libration, causing intermittent Direct-to-Earth (DTE) communication blackouts. LunarSite Compare provides rapid scenario evaluation to identify optimal landing sites and dates.",
    keyTakeaways: [
      'Grazing solar incidence requires vertical or elevated solar panels.',
      'Permanently shadowed regions (PSRs) coexist with high-illumination peaks.',
      'Direct-to-Earth communication requires line-of-sight clearing local topography.'
    ]
  },
  {
    title: 'Interactive 3D Moon Globe',
    badge: 'Global Spatial Context',
    content:
      'The 3D globe models the Moon with a dynamic GLSL day/night terminator shader computed directly from the live sub-solar selenographic point. 19 curated landing sites—including Artemis candidate regions, CLPS commercial targets, Apollo heritage locations, and international missions—are plotted as interactive pins. Click anywhere on the globe or pick from the catalog to orient the mission control view.',
    keyTakeaways: [
      'Sub-solar and sub-Earth vectors updated continuously in real-time.',
      'South pole focus reveals regional crater geometry (Shackleton, Malapert, de Gerlache).',
      'Supports custom user-defined selenographic coordinates.'
    ]
  },
  {
    title: 'Topocentric Sky Dial & Terrain Skyline',
    badge: 'Local Horizon Profiling',
    content:
      'The Polar Sky Dial projects the 360° topocentric sky relative to local cardinal axes (N, E, S, W). It overlays real raycasted terrain horizon profiles from 20m/px LOLA digital elevation models. The first-person skyline view lets you look out from a 2-meter lander mast to verify exactly when the Sun and Earth are visible above or occluded behind crater rims.',
    keyTakeaways: [
      'Solar upper limb threshold (+0.267°) accurately predicts sunrise/sunset.',
      'Earth line-of-sight checks terrain clearance for high-bandwidth radio links.',
      'Vertical solar power proxy accounts for normal incidence at polar latitudes.'
    ]
  },
  {
    title: '29.53-Day Synodic Timeline Strip',
    badge: 'Synodic Mission History',
    content:
      'A complete lunar synodic month lasts approximately 29.53 Earth days. The timeline strip continuously plots topocentric Sun and Earth elevation curves alongside the local terrain threshold. Shaded operational bands below the chart highlight sunlight periods (amber) and DTE communication windows (emerald). Drag the red NOW cursor to scrub time interactively.',
    keyTakeaways: [
      'Zoom presets for 24 hours, 7 days, and full 29.53-day lunar day.',
      'Hover inspection displays exact UTC timestamps and elevation angles.',
      'Simulation playback controls allow speeds from 1x up to 10,000x real-time.'
    ]
  },
  {
    title: 'Comparative Matrix & Date-Sweep Heatmap',
    badge: 'Multi-Scenario Planning',
    content:
      'Mission planning rarely proceeds on a fixed timeline. Launch slips require quick evaluation of alternative dates or backup sites. The Comparative Matrix evaluates up to 4 concurrent scenarios side by side. Pairwise Delta Analysis computes exact trade-offs (e.g. +14 hrs of sunlight vs. -6 hrs of comms blackout), while the 1-Year Date-Sweep Heatmap sweeps 48 candidate epochs across 12 synodic cycles to find the best launch windows.',
    keyTakeaways: [
      'Automated trade-off synthesis highlights power vs. comms compromises.',
      'Single-click time scrubbing from the date-sweep calendar heatmap.',
      'One-click client-side CSV and Markdown report export.'
    ]
  },
  {
    title: 'Dual Modes & Mission Navigation',
    badge: 'Mission Control Ready',
    content:
      'Use the Overview mode for plain-language educational summaries, or switch to Technical mode for astrometric frames, sub-body coordinates, libration angles, and decimals. The tool runs completely client-side in your browser with zero server dependencies.',
    keyTakeaways: [
      'Space: Play / Pause simulation playback.',
      'Arrow keys: Step backward or forward through time.',
      '1, 2, 3: Switch between 3D Globe, 3D Terrain, and Horizon Panorama.',
      'm: Toggle Overview / Technical mode | c: Toggle Comparison Matrix | ?: Toggle Mission Guide.'
    ]
  }
];

export function GuidedTour(): React.JSX.Element | null {
  const { isTourOpen, setTourOpen } = useUIStore();
  const [currentStep, setCurrentStep] = useState<number>(0);

  if (!isTourOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      setTourOpen(false);
      setCurrentStep(0);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setTourOpen(false);
    setCurrentStep(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0A09]/80 p-4 backdrop-blur-md select-none animate-fadeIn">
      <div className="glass-panel flex w-full max-w-xl flex-col rounded-3xl p-6 shadow-2xl overflow-hidden font-sans space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-panel-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <Icon icon={Compass} size={18} className="text-amber" />
            <span className="font-mono text-sm font-bold tracking-wider text-amber">
              MISSION CONTROL GUIDE
            </span>
            <Badge variant="amber" size="sm">
              {step.badge}
            </Badge>
          </div>
          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-panel-border bg-panel text-muted hover:text-ink hover:border-muted transition-colors"
            title="Close guide"
            aria-label="Close guide"
          >
            <Icon icon={X} size={16} />
          </button>
        </div>

        {/* Body Content */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-ink">{step.title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted">{step.content}</p>
          </div>

          {/* Key Takeaways Card */}
          <div className="rounded-2xl border border-panel-border bg-panel p-4 space-y-2">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber">
              Operational Key Highlights
            </div>
            <ul className="space-y-1.5 text-xs text-ink">
              {step.keyTakeaways.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer with Step Dots and Navigation */}
        <div className="flex items-center justify-between border-t border-panel-border pt-4">
          {/* Step Indicator Dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep ? 'w-5 bg-amber' : 'w-2 bg-[#2E2A26] hover:bg-muted'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
            <span className="font-mono text-[10px] text-muted ml-2">
              {currentStep + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          {/* Nav Buttons */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button size="sm" variant="outline" onClick={handlePrev} className="text-xs flex items-center gap-1">
                <Icon icon={ChevronLeft} size={16} />
                <span>Back</span>
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={handleNext} className="text-xs px-4 flex items-center gap-1.5">
              {isLast ? (
                <>
                  <Icon icon={Rocket} size={16} />
                  <span>Launch Mission Control</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <Icon icon={ChevronRight} size={16} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
