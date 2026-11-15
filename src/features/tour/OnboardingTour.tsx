import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  X,
  Compass,
  Columns3,
  CheckCircle2
} from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useScenarioStore } from '../../store/useScenarioStore';
import { useTimeStore } from '../../store/useTimeStore';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { showToast } from '../../ui/toastStore';

interface TourStepDef {
  id: string;
  targetSelector: string; // e.g. '[data-tour="viewport-canvas"]'
  title: string;
  badge: string;
  benefit: string;
  action: string;
  isLarge?: boolean;
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right';
  prepareState?: () => void;
}

const TOUR_STEPS: TourStepDef[] = [
  {
    id: 'viewport-canvas',
    targetSelector: '[data-tour="viewport-canvas"]',
    title: 'Interactive 3D Moon Globe',
    badge: 'Step 1: Global Context',
    benefit: 'Explore global illumination and landing sites in true celestial geometry.',
    action: 'Drag to rotate the Moon, zoom into the South Pole, or tap the Sun and Earth in space to fly directly to them.',
    isLarge: true,
    preferredPlacement: 'bottom',
    prepareState: () => {
      useUIStore.getState().setActiveCenterTab('globe');
    }
  },
  {
    id: 'viewport-tabs',
    targetSelector: '[data-tour="viewport-tabs"]',
    title: 'Multi-Perspective Viewports',
    badge: 'Step 2: Surface & Orbit',
    benefit: 'Shift perspectives seamlessly from global orbit to surface ground truth.',
    action: 'Switch between the 3D Moon, 20m/px Local Terrain, and First-Person Skyline to inspect crater rim shadows.',
    preferredPlacement: 'bottom',
    prepareState: () => {
      useUIStore.getState().setActiveCenterTab('terrain');
    }
  },
  {
    id: 'skyline-view',
    targetSelector: '[data-tour="skyline-view"]',
    title: 'First-Person Skyline & LOLA Horizon',
    badge: 'Step 3: Horizon Line-of-Sight',
    benefit: 'Verify line-of-sight directly from a 2-meter lander mast before landing.',
    action: 'Real 20m LOLA topographic raycasts show whether the low polar Sun and Earth clear the crater ridges.',
    preferredPlacement: 'bottom',
    prepareState: () => {
      useUIStore.getState().setActiveCenterTab('horizon');
    }
  },
  {
    id: 'site-browser',
    targetSelector: '[data-tour="site-browser"]',
    title: 'Landing Site Catalog & Search',
    badge: 'Step 4: Target Selection',
    benefit: 'Select from 19 curated Artemis, CLPS, and heritage landing sites—or input custom coordinates.',
    action: 'Click any site to inspect its terrain, or check the box to add it to your comparative evaluation list.',
    preferredPlacement: 'right',
    prepareState: () => {
      useUIStore.getState().setActiveCenterTab('globe');
    }
  },
  {
    id: 'sky-dial',
    targetSelector: '[data-tour="sky-dial"]',
    title: 'Topocentric Sky Dial',
    badge: 'Step 5: Polar Telemetry',
    benefit: 'Assess 360° solar power and Earth comms availability at a glance.',
    action: 'The polar dial projects local topography profiles against live celestial positions in real time.',
    preferredPlacement: 'left',
    prepareState: () => {
      useUIStore.getState().setActiveCenterTab('globe');
    }
  },
  {
    id: 'timeline-dock',
    targetSelector: '[data-tour="timeline-dock"]',
    title: '29.53-Day Synodic Timeline',
    badge: 'Step 6: Mission History',
    benefit: 'Forecast power and communication windows across a complete lunar synodic month.',
    action: 'Drag the timeline cursor to scrub time, and adjust playback speed from 1x up to 10,000x real-time.',
    preferredPlacement: 'top',
    prepareState: () => {
      useTimeStore.getState().stepTime(3600); // step forward slightly to demonstrate
    }
  },
  {
    id: 'compare-button',
    targetSelector: '[data-tour="compare-button"]',
    title: 'Comparative Scenario Matrix',
    badge: 'Step 7: Trade-Off Analysis',
    benefit: 'Evaluate mission trade-offs across multiple candidate sites side by side.',
    action: 'Compare up to 4 sites simultaneously and sweep 12 synodic cycles for optimal launch dates.',
    preferredPlacement: 'bottom',
    prepareState: () => {
      // Return to nominal simulation time
    }
  },
  {
    id: 'mode-switcher',
    targetSelector: '[data-tour="mode-switcher"]',
    title: 'Mission Control Readiness',
    badge: 'Step 8: Dual Fidelity Modes',
    benefit: 'Switch between plain-language Overview summaries and astrometric Technical telemetry.',
    action: 'You are ready to plan and evaluate lunar missions with authentic NASA topographic data.',
    preferredPlacement: 'bottom',
    prepareState: () => {
      useUIStore.getState().setActiveCenterTab('globe');
    }
  }
];

export function OnboardingTour(): React.JSX.Element | null {
  const {
    isOnboardingOpen,
    onboardingStep,
    onboardingSingleStep,
    setOnboardingOpen,
    setOnboardingStep,
    setHasSeenOnboarding,
    setCompareOpen,
    activeCenterTab,
    mode
  } = useUIStore();

  // Saved original state to restore on finish/skip
  const savedStateRef = useRef<{
    activeTab: typeof activeCenterTab;
    siteId: string | null;
    wasPlaying: boolean;
    mode: typeof mode;
  } | null>(null);

  // Spotlight target coordinates
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  // Filter steps under 820px (mobile) to only available elements
  const activeSteps = useMemo(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 820) {
      return TOUR_STEPS.filter((step) => {
        // Exclude site-browser and sky-dial if hidden in closed drawers
        if (step.id === 'site-browser' || step.id === 'sky-dial') {
          return false;
        }
        return true;
      });
    }
    return TOUR_STEPS;
  }, [windowSize.width]);

  // Current step calculation
  const currentStepIndex = Math.min(onboardingStep, activeSteps.length - 1);
  const currentStep = activeSteps[currentStepIndex] || activeSteps[0];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === activeSteps.length - 1;
  const isSingleStepMode = onboardingSingleStep !== null;

  // Save state upon tour opening and pause simulation
  useEffect(() => {
    if (isOnboardingOpen && !savedStateRef.current) {
      savedStateRef.current = {
        activeTab: useUIStore.getState().activeCenterTab,
        siteId: useScenarioStore.getState().activeSiteId,
        wasPlaying: useTimeStore.getState().isPlaying,
        mode: useUIStore.getState().mode
      };

      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      // Pause simulation
      if (useTimeStore.getState().isPlaying) {
        useTimeStore.getState().togglePlay();
      }
    }
  }, [isOnboardingOpen]);

  // Measure and track target element
  const updateTargetRect = useCallback(() => {
    if (!currentStep) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Execute step state preparation
  useEffect(() => {
    if (!isOnboardingOpen || !currentStep) return;
    currentStep.prepareState?.();
    // Allow React transition to paint before measuring target rect
    const timer = setTimeout(() => {
      updateTargetRect();
    }, 120);
    return () => clearTimeout(timer);
  }, [isOnboardingOpen, currentStep, updateTargetRect]);

  // ResizeObserver and window resize listener
  useEffect(() => {
    if (!isOnboardingOpen) return;

    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      updateTargetRect();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', updateTargetRect);

    // Observe body for layout shifts
    const observer = new ResizeObserver(() => {
      updateTargetRect();
    });
    observer.observe(document.body);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', updateTargetRect);
      observer.disconnect();
    };
  }, [isOnboardingOpen, updateTargetRect]);

  // Restore state helper
  const restoreOriginalState = useCallback(() => {
    if (savedStateRef.current) {
      const { activeTab, siteId, wasPlaying, mode: savedMode } = savedStateRef.current;
      useUIStore.getState().setActiveCenterTab(activeTab);
      useUIStore.getState().setMode(savedMode);
      if (siteId) {
        useScenarioStore.getState().setActiveSiteId(siteId);
      }
      if (wasPlaying && !useTimeStore.getState().isPlaying) {
        useTimeStore.getState().togglePlay();
      }
      savedStateRef.current = null;
    }
  }, []);

  const handleNext = () => {
    if (isLast || isSingleStepMode) {
      handleFinish();
    } else {
      setOnboardingStep(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst && !isSingleStepMode) {
      setOnboardingStep(currentStepIndex - 1);
    }
  };

  const handleSkip = () => {
    restoreOriginalState();
    setOnboardingOpen(false);
    setHasSeenOnboarding(true);
    showToast({
      title: 'Tour Skipped',
      subtitle: 'Reopen it anytime from Help.',
      severity: 'info'
    });
  };

  const handleFinish = () => {
    restoreOriginalState();
    setOnboardingOpen(false);
    setHasSeenOnboarding(true);
    showToast({
      title: 'Onboarding Complete',
      subtitle: 'Mission Control ready for scenario navigation.',
      severity: 'success'
    });
  };

  const handleTryComparison = () => {
    restoreOriginalState();
    // Pre-populate comparison with 2 default sites if empty
    const store = useScenarioStore.getState();
    if (store.scenarios.length === 0) {
      store.addScenario({
        id: crypto.randomUUID(),
        label: 'Connecting Ridge',
        siteId: 'shackleton-connecting-ridge',
        landingTimeIso: new Date().toISOString(),
        themeColor: '#F5A524'
      });
      store.addScenario({
        id: crypto.randomUUID(),
        label: 'Haworth Rim',
        siteId: 'haworth-crater-rim',
        landingTimeIso: new Date().toISOString(),
        themeColor: '#10B981'
      });
    }
    setOnboardingOpen(false);
    setHasSeenOnboarding(true);
    setCompareOpen(true);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOnboardingOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!isOnboardingOpen) return null;

  // Compute Popover Positioning with boundary clamping & collision flipping
  const popoverStyle = (() => {
    const defaultStyle: React.CSSProperties = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 75
    };

    if (!targetRect) return defaultStyle;

    const popoverWidth = Math.min(380, windowSize.width - 32);
    const popoverHeight = 260;
    const padding = 16;
    const targetPad = 12;

    let placement = currentStep.preferredPlacement || 'bottom';

    // Auto-flip if overflowing bottom
    if (placement === 'bottom' && targetRect.bottom + popoverHeight + targetPad > windowSize.height - padding) {
      placement = 'top';
    } else if (placement === 'top' && targetRect.top - popoverHeight - targetPad < padding) {
      placement = 'bottom';
    } else if (placement === 'right' && targetRect.right + popoverWidth + targetPad > windowSize.width - padding) {
      placement = 'left';
    } else if (placement === 'left' && targetRect.left - popoverWidth - targetPad < padding) {
      placement = 'right';
    }

    let top = 0;
    let left = 0;

    if (placement === 'bottom') {
      top = targetRect.bottom + targetPad;
      left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
    } else if (placement === 'top') {
      top = targetRect.top - popoverHeight - targetPad;
      left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
    } else if (placement === 'right') {
      top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
      left = targetRect.right + targetPad;
    } else if (placement === 'left') {
      top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
      left = targetRect.left - popoverWidth - targetPad;
    }

    // Clamp inside viewport
    left = Math.max(padding, Math.min(windowSize.width - popoverWidth - padding, left));
    top = Math.max(padding, Math.min(windowSize.height - popoverHeight - padding, top));

    return {
      position: 'fixed' as const,
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      width: `${popoverWidth}px`,
      zIndex: 75
    };
  })();

  const isLargeTarget = Boolean(currentStep.isLarge);
  const pad = 8;
  const rx = isLargeTarget ? 24 : 12;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentStep.title}
      className="fixed inset-0 z-tour select-none"
    >
      {/* SVG Spotlight Mask Backdrop */}
      <svg
        className="fixed inset-0 h-full w-full pointer-events-auto"
        style={{ zIndex: 71 }}
      >
        <defs>
          <mask id="spotlight-mask">
            {/* White covers entire screen */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout reveals the target element */}
            {targetRect && (
              <rect
                x={targetRect.x - pad}
                y={targetRect.y - pad}
                width={targetRect.width + pad * 2}
                height={targetRect.height + pad * 2}
                rx={rx}
                ry={rx}
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Backdrop color: charcoal ground #0B0A09, 70% opacity (or 35% on large targets) */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="#0B0A09"
          fillOpacity={isLargeTarget ? 0.35 : 0.72}
          mask="url(#spotlight-mask)"
        />

        {/* Spotlight Outline / HUD Brackets */}
        {targetRect && (
          isLargeTarget ? (
            /* HUD Corner Brackets for very large viewports */
            <g
              stroke="#F5A524"
              strokeWidth="2.5"
              fill="none"
              opacity="0.9"
              className="motion-reduce:animate-none"
            >
              {/* Top-Left Bracket */}
              <path
                d={`M ${targetRect.x - pad} ${targetRect.y - pad + 32} L ${targetRect.x - pad} ${targetRect.y - pad + 16} Q ${targetRect.x - pad} ${targetRect.y - pad} ${targetRect.x - pad + 16} ${targetRect.y - pad} L ${targetRect.x - pad + 32} ${targetRect.y - pad}`}
              />
              {/* Top-Right Bracket */}
              <path
                d={`M ${targetRect.right + pad - 32} ${targetRect.y - pad} L ${targetRect.right + pad - 16} ${targetRect.y - pad} Q ${targetRect.right + pad} ${targetRect.y - pad} ${targetRect.right + pad} ${targetRect.y - pad + 16} L ${targetRect.right + pad} ${targetRect.y - pad + 32}`}
              />
              {/* Bottom-Left Bracket */}
              <path
                d={`M ${targetRect.x - pad} ${targetRect.bottom + pad - 32} L ${targetRect.x - pad} ${targetRect.bottom + pad - 16} Q ${targetRect.x - pad} ${targetRect.bottom + pad} ${targetRect.x - pad + 16} ${targetRect.bottom + pad} L ${targetRect.x - pad + 32} ${targetRect.bottom + pad}`}
              />
              {/* Bottom-Right Bracket */}
              <path
                d={`M ${targetRect.right + pad - 32} ${targetRect.bottom + pad} L ${targetRect.right + pad - 16} ${targetRect.bottom + pad} Q ${targetRect.right + pad} ${targetRect.bottom + pad} ${targetRect.right + pad} ${targetRect.bottom + pad - 16} L ${targetRect.right + pad} ${targetRect.bottom + pad - 32}`}
              />
            </g>
          ) : (
            /* Rounded 2px Amber Outline with faint glow */
            <rect
              x={targetRect.x - pad}
              y={targetRect.y - pad}
              width={targetRect.width + pad * 2}
              height={targetRect.height + pad * 2}
              rx={rx}
              ry={rx}
              fill="none"
              stroke="#F5A524"
              strokeWidth="2"
              className="site-dot-pulse motion-reduce:animate-none"
            />
          )
        )}
      </svg>

      {/* Popover Card */}
      <div
        style={popoverStyle}
        className="rounded-2xl border border-panel-border bg-[#141210]/95 p-4 shadow-2xl backdrop-blur-xl animate-fadeIn font-sans text-ink"
      >
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-2xl bg-white/5">
          <div
            className="h-full bg-amber transition-all duration-300"
            style={{
              width: `${((currentStepIndex + 1) / activeSteps.length) * 100}%`
            }}
          />
        </div>

        {/* Header: Counter, Badge & Close */}
        <div className="flex items-center justify-between border-b border-panel-border/60 pb-2.5 pt-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-amber">
              {String(currentStepIndex + 1).padStart(2, '0')} / {String(activeSteps.length).padStart(2, '0')}
            </span>
            <span className="rounded-md border border-amber/30 bg-amber/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber">
              {currentStep.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="rounded p-1 text-muted hover:text-ink transition-colors"
            title="Skip tour (Esc)"
            aria-label="Skip tour"
          >
            <Icon icon={X} size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-3 space-y-2">
          <h3 className="text-sm font-bold text-ink flex items-center gap-1.5">
            <Icon icon={Compass} size={16} className="text-amber shrink-0" />
            <span>{currentStep.title}</span>
          </h3>
          <p className="text-xs font-semibold text-ink leading-snug">
            {currentStep.benefit}
          </p>
          <p className="text-xs text-muted leading-relaxed">
            {currentStep.action}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-panel-border/60">
          <button
            type="button"
            onClick={handleSkip}
            className="text-[11px] font-mono text-muted hover:text-amber transition-colors underline-offset-2 hover:underline"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && !isSingleStepMode && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePrev}
                className="text-xs h-7 px-2 text-muted hover:text-ink flex items-center gap-1"
              >
                <Icon icon={ChevronLeft} size={16} />
                <span>Back</span>
              </Button>
            )}

            {isLast ? (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTryComparison}
                  className="text-xs h-7 px-2 text-amber border-amber/40 hover:border-amber flex items-center gap-1 shadow-xs"
                >
                  <Icon icon={Columns3} size={16} />
                  <span>Compare Sites</span>
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleFinish}
                  className="text-xs h-7 px-3 font-semibold shadow-md flex items-center gap-1"
                >
                  <Icon icon={CheckCircle2} size={16} />
                  <span>Finish</span>
                </Button>
              </div>
            ) : isSingleStepMode ? (
              <Button
                size="sm"
                variant="primary"
                onClick={handleFinish}
                className="text-xs h-7 px-3 font-semibold shadow-md flex items-center gap-1"
              >
                <Icon icon={CheckCircle2} size={16} />
                <span>Got it</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="primary"
                onClick={handleNext}
                className="text-xs h-7 px-3 font-semibold shadow-md flex items-center gap-1"
              >
                <span>Next</span>
                <Icon icon={ChevronRight} size={16} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
