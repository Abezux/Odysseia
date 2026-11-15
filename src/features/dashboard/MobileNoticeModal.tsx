import React, { useEffect, useRef, useState } from 'react';
import { Monitor, Copy, Check } from 'lucide-react';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';
import { useUIStore } from '../../store/useUIStore';

const STORAGE_KEY = 'odysseia_mobile_notice_dismissed';

export function isPhoneSizedDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  // Never show on desktop windows with a fine pointer:
  if (!isCoarse) return false;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;

  // Never show on tablets in landscape:
  if (isLandscape && width >= 768) return false;

  const shortSide = Math.min(width, height);
  return width < 768 || shortSide < 820;
}

export function MobileNoticeModal(): React.JSX.Element | null {
  const { setView } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);

  const checkEligibility = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const dismissed = window.sessionStorage.getItem(STORAGE_KEY);
        if (dismissed === 'true') {
          setIsOpen(false);
          return;
        }
      }
    } catch {
      // Ignore sessionStorage exceptions
    }

    if (isPhoneSizedDevice()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    checkEligibility();

    const handleOrientationChange = () => {
      checkEligibility();
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  // Keyboard navigation: Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus trap inside modal
  useEffect(() => {
    if (isOpen) {
      copyButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleDismiss = () => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(STORAGE_KEY, 'true');
      }
    } catch {
      // Ignore sessionStorage exceptions
    }
    setIsOpen(false);
  };

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href.split('?')[0] : '';
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleBackToLanding = () => {
    handleDismiss();
    setView('landing');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-notice-title"
      aria-describedby="mobile-notice-desc"
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-sm rounded-3xl border border-[rgba(82,74,66,0.4)] bg-[rgba(26,24,22,0.92)] p-6 backdrop-blur-xl shadow-2xl text-center font-sans animate-fadeIn"
      >
        {/* Monitor Icon in amber square */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-amber/30 bg-amber/15 text-amber">
          <Icon icon={Monitor} size={20} />
        </div>

        {/* Title & Body Copy */}
        <h3 id="mobile-notice-title" className="text-base font-bold text-ink">
          Best on a laptop or desktop
        </h3>
        <p id="mobile-notice-desc" className="mt-2 text-xs text-muted leading-relaxed">
          Mission Control uses a 3D Moon globe, terrain and a live timeline that need a larger screen
          and a mouse. Open this link on a computer for the full experience.
        </p>

        {/* Buttons */}
        <div className="mt-6 flex flex-col gap-2.5">
          <Button
            ref={copyButtonRef}
            variant="primary"
            size="md"
            onClick={handleCopyLink}
            className="w-full justify-center text-xs font-semibold"
          >
            <Icon icon={isCopied ? Check : Copy} size={16} />
            <span>{isCopied ? 'Link copied' : 'Copy link'}</span>
          </Button>

          <Button
            variant="ghost"
            size="md"
            onClick={handleDismiss}
            className="w-full justify-center text-xs text-muted hover:text-ink"
          >
            Continue anyway
          </Button>

          <button
            type="button"
            onClick={handleBackToLanding}
            className="mt-1 text-[11px] font-mono text-muted hover:text-amber underline decoration-hairline transition-colors"
          >
            Back to Odysseia
          </button>
        </div>
      </div>
    </div>
  );
}
