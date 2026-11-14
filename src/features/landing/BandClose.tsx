import React, { useEffect, useState, useRef } from 'react';

interface BandCloseProps {
  onEnterApp: () => void;
}

export function BandClose({ onEnterApp }: BandCloseProps): React.JSX.Element {
  const [parallaxY, setParallaxY] = useState(0);
  const [parallaxScale, setParallaxScale] = useState(1.08);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setParallaxY(0);
      setParallaxScale(1);
      return;
    }

    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const h = window.innerHeight;
      // Calculate progress while in view
      const progress = Math.min(1, Math.max(0, (h - rect.top) / (h + rect.height)));
      setParallaxY(-progress * 6); // translateY 0 to -6%
      setParallaxScale(1.08 - progress * 0.08); // scale 1.08 to 1.0
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      id="close"
      ref={sectionRef}
      className="relative flex min-h-[85vh] w-full flex-col justify-center overflow-hidden bg-ground select-none py-28"
    >
      {/* Chapter 6 Astronaut Background: Looking at the Horizon */}
      <picture className="absolute inset-0 h-full w-full pointer-events-none">
        <source
          media="(max-width: 768px)"
          srcSet={`${import.meta.env.BASE_URL}launch-astronaut-horizon-portrait.webp`}
          type="image/webp"
        />
        <img
          src={`${import.meta.env.BASE_URL}launch-astronaut-horizon.webp`}
          alt="Astronaut looking out toward the lunar horizon"
          loading="lazy"
          className="h-full w-full object-cover object-right transition-transform duration-100 ease-out will-change-transform"
          style={{
            transform: `translateY(${parallaxY}%) scale(${parallaxScale})`,
            objectPosition: 'right center'
          }}
        />
      </picture>

      {/* Downward Veil & Subtle Radial Vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `
            linear-gradient(to bottom, rgba(11, 10, 9, 0.45) 0%, rgba(11, 10, 9, 0.92) 100%),
            radial-gradient(circle at center, transparent 30%, rgba(11, 10, 9, 0.8) 100%)
          `
        }}
      />

      {/* Foreground Content */}
      <div className="relative z-20 mx-auto w-full max-w-[1152px] px-[clamp(20px,5vw,64px)] text-center">
        {/* Eyebrow */}
        <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted mb-6">
          06 · COMMENCE
        </div>

        {/* Centred statement capped at 16ch */}
        <h2
          className="font-sans font-light tracking-[-0.04em] leading-[0.95] text-ink mx-auto"
          style={{
            fontSize: 'clamp(2.4rem, 7vw, 5.4rem)',
            maxWidth: '16ch'
          }}
        >
          Step into the command deck.
        </h2>

        <p className="mt-6 mx-auto font-sans font-light text-[15px] leading-[1.7] text-muted max-w-[42ch]">
          Simulate landing trajectories, evaluate topocentric terrain horizons, and identify resilient landing windows.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onEnterApp}
            className="rounded-none bg-amber px-8 py-4 font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-ground transition-colors hover:bg-amber-gold active:bg-amber-pressed focus:outline-none"
          >
            Enter Mission Control
          </button>
          <a
            href="https://github.com/Abezux/Odysseia"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-none border border-hairline bg-transparent px-8 py-4 font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-ink transition-colors hover:border-muted hover:bg-panel focus:outline-none"
          >
            Review Source Code
          </a>
        </div>
      </div>
    </section>
  );
}
