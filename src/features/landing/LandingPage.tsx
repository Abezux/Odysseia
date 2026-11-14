import React, { useEffect } from 'react';
import { IntroStage } from './IntroStage';
import { LandingNav } from './LandingNav';
import { HeroSection } from './HeroSection';
import { BandPeril } from './BandPeril';
import { BandDilemma } from './BandDilemma';
import { BandOdysseia } from './BandOdysseia';
import { BandVerdict } from './BandVerdict';
import { BandFAQ } from './BandFAQ';
import { BandClose } from './BandClose';
import { MonoFooter } from './MonoFooter';

interface LandingPageProps {
  onEnterApp: () => void;
}

export function LandingPage({ onEnterApp }: LandingPageProps): React.JSX.Element {
  useEffect(() => {
    // If prefers-reduced-motion is active, reveal immediately with no transition
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('.reveal-block').forEach((el) => {
        el.classList.add('is-revealed');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -8% 0px'
      }
    );

    const revealElements = document.querySelectorAll('.reveal-block');
    revealElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-ground text-ink font-sans selection:bg-amber selection:text-ground">
      {/* 1. Intro Stage */}
      <IntroStage />

      {/* 2. Fixed Translucent Nav */}
      <LandingNav onEnterApp={onEnterApp} />

      {/* 3. Hero Section (Chapter 1 · Prologue) */}
      <HeroSection onEnterApp={onEnterApp} />

      {/* 4. Band 01 · Peril (Chapter 2) */}
      <div className="reveal-block">
        <BandPeril />
      </div>

      {/* 5. Band 02 · Dilemma (Chapter 3) */}
      <div className="reveal-block">
        <BandDilemma />
      </div>

      {/* 6. Band 03 · Odysseia (Chapter 4) */}
      <div className="reveal-block">
        <BandOdysseia />
      </div>

      {/* 7. Band 04 · Verdict (Chapter 5) */}
      <div className="reveal-block">
        <BandVerdict />
      </div>

      {/* 8. FAQ (Chapter 6 Inquiry) */}
      <div className="reveal-block">
        <BandFAQ />
      </div>

      {/* 9. Closing Band (Chapter 6 Commence) */}
      <div className="reveal-block">
        <BandClose onEnterApp={onEnterApp} />
      </div>

      {/* 10. Mono Footer */}
      <MonoFooter />
    </div>
  );
}
export default LandingPage;
