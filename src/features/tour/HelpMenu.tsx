import React, { useRef, useState } from 'react';
import { HelpCircle, Compass, BookOpen, Keyboard, RotateCcw } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { PortalPopover } from '../../ui/PortalPopover';
import { Icon } from '../../ui/Icon';
import { showToast } from '../../ui/toastStore';

export function HelpMenu(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { setOnboardingOpen, setFeatureGuideOpen, resetOnboarding } = useUIStore();

  const handleStartTour = () => {
    setIsOpen(false);
    setOnboardingOpen(true, 0);
  };

  const handleOpenGuide = () => {
    setIsOpen(false);
    setFeatureGuideOpen(true);
  };

  const handleOpenShortcuts = () => {
    setIsOpen(false);
    setFeatureGuideOpen(true);
  };

  const handleReset = () => {
    setIsOpen(false);
    resetOnboarding();
    showToast({
      title: 'Onboarding Reset',
      subtitle: 'First-time mission tour re-armed.',
      severity: 'info'
    });
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        data-tour="help-menu"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-panel-border bg-panel text-muted hover:text-amber hover:border-amber/40 transition-colors focus:outline-none"
        title="Help & Mission Guide (?)"
        aria-label="Help and Mission Guide"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Icon icon={HelpCircle} size={18} />
      </button>

      <PortalPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={buttonRef}
        align="end"
      >
        <div className="w-56 rounded-2xl glass-panel p-2 shadow-2xl border border-panel-border bg-[#141210]/95 backdrop-blur-xl text-ink font-sans">
          <div className="px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-muted border-b border-panel-border/60">
            Mission Assistance
          </div>

          <div className="py-1 space-y-0.5">
            <button
              type="button"
              onClick={handleStartTour}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-ink hover:bg-white/5 hover:text-amber transition-colors text-left"
            >
              <Icon icon={Compass} size={16} className="text-amber shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold leading-tight">Start 60s Tour</span>
                <span className="text-[10px] text-muted">Core features walkthrough</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleOpenGuide}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-ink hover:bg-white/5 hover:text-amber transition-colors text-left"
            >
              <Icon icon={BookOpen} size={16} className="text-amber shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold leading-tight">Feature Guide</span>
                <span className="text-[10px] text-muted">Complete telemetry reference</span>
              </div>
            </button>

            <button
              type="button"
              onClick={handleOpenShortcuts}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs text-ink hover:bg-white/5 hover:text-amber transition-colors text-left"
            >
              <Icon icon={Keyboard} size={16} className="text-muted shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold leading-tight">Shortcuts</span>
                <span className="text-[10px] text-muted">Space, Arrows, 1-3, M, C, ?</span>
              </div>
            </button>
          </div>

          <div className="border-t border-panel-border/60 pt-1 mt-0.5">
            <button
              type="button"
              onClick={handleReset}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] text-muted hover:text-ink hover:bg-white/5 transition-colors text-left"
            >
              <Icon icon={RotateCcw} size={16} className="shrink-0" />
              <span>Reset Onboarding</span>
            </button>
          </div>
        </div>
      </PortalPopover>
    </div>
  );
}
