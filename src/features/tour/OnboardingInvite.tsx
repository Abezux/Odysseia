import React, { useEffect, useState } from 'react';
import { Compass, X } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { showToast } from '../../ui/toastStore';
import { isPhoneSizedDevice } from '../dashboard/MobileNoticeModal';

export function OnboardingInvite(): React.JSX.Element | null {
  const { hasSeenOnboarding, isOnboardingOpen, setOnboardingOpen, setHasSeenOnboarding } = useUIStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if user hasn't seen or skipped this tour version, tour is not open, and device is not phone-sized
    if (hasSeenOnboarding || isOnboardingOpen || isPhoneSizedDevice()) return;

    const timer = setTimeout(() => {
      if (!isPhoneSizedDevice()) {
        setIsVisible(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [hasSeenOnboarding, isOnboardingOpen]);

  if (!isVisible || hasSeenOnboarding || isOnboardingOpen || isPhoneSizedDevice()) {
    return null;
  }

  const handleStart = () => {
    setIsVisible(false);
    setOnboardingOpen(true, 0);
  };

  const handleSkip = () => {
    setIsVisible(false);
    setHasSeenOnboarding(true);
    showToast({
      title: 'Tour Skipped',
      subtitle: 'Reopen it anytime from Help.',
      severity: 'info'
    });
  };

  return (
    <div
      role="region"
      aria-label="Onboarding invitation"
      className="fixed bottom-24 right-4 sm:right-6 z-modal flex w-80 max-w-[calc(100vw-32px)] flex-col gap-3 rounded-2xl border border-panel-border bg-[#141210]/95 p-4 shadow-2xl backdrop-blur-xl animate-fadeIn font-sans"
    >
      <div className="flex items-start justify-between gap-2 border-b border-panel-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber/15 text-amber border border-amber/30">
            <Icon icon={Compass} size={16} />
          </div>
          <div>
            <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-amber">
              WELCOME TO MISSION CONTROL
            </div>
            <h4 className="text-xs font-bold text-ink">Take a 60-second tour?</h4>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="rounded p-1 text-muted hover:text-ink transition-colors"
          title="Dismiss invite"
          aria-label="Dismiss invite"
        >
          <Icon icon={X} size={16} />
        </button>
      </div>

      <p className="text-xs text-muted leading-relaxed">
        Discover how to evaluate polar solar power, Earth communication links, and optimal lunar landing windows.
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSkip}
          className="text-xs h-7 text-muted hover:text-ink"
        >
          Skip
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={handleStart}
          className="text-xs h-7 px-3 font-semibold shadow-md"
        >
          Start Tour
        </Button>
      </div>
    </div>
  );
}
