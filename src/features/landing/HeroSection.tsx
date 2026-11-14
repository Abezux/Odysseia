import React, { useEffect, useState, useRef } from 'react';
import { HeroRibbonShader } from './HeroRibbonShader';

interface HeroSectionProps {
  onEnterApp: () => void;
}

export function HeroSection({ onEnterApp }: HeroSectionProps): React.JSX.Element {
  const [introCleared, setIntroCleared] = useState(false);
  const [parallaxY, setParallaxY] = useState(0);
  const [parallaxScale, setParallaxScale] = useState(1.08);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Reveal headline characters after intro stage finishes
    const timer = setTimeout(() => {
      setIntroCleared(true);
    }, 2100);

    // Parallax scroll listener
    const handleScroll = () => {
      if (!heroRef.current) return;
      const scrollY = window.scrollY;
      const h = heroRef.current.offsetHeight || window.innerHeight;
      const progress = Math.min(1, Math.max(0, scrollY / h));
      setParallaxY(-progress * 6); // translateY 0 to -6%
      setParallaxScale(1.08 - progress * 0.08); // scale 1.08 to 1.0
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Headline text: "WHERE LIGHT DIES" with "LIGHT" in amber
  const words = [
    { text: 'WHERE', isAmber: false },
    { text: 'LIGHT', isAmber: true },
    { text: 'DIES', isAmber: false }
  ];

  let charCount = 0;

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[100svh] w-full flex-col justify-end overflow-hidden bg-ground select-none pt-24 pb-16"
    >
      {/* Layer 1: Astronaut Closed-Eyes Background with slow parallax */}
      <picture className="absolute inset-0 h-full w-full pointer-events-none">
        <source
          media="(max-width: 768px)"
          srcSet="/hero-astronaut-closed-portrait.webp"
          type="image/webp"
        />
        <img
          src="/hero-astronaut-closed.webp"
          alt="Astronaut resting in spacesuit"
          className="h-full w-full object-cover object-right transition-transform duration-100 ease-out will-change-transform"
          style={{
            transform: `translateY(${parallaxY}%) scale(${parallaxScale})`,
            objectPosition: 'right center'
          }}
        />
      </picture>

      {/* Layer 2: WebGL Grazing Sun Ribbon Shader */}
      <HeroRibbonShader />

      {/* Layer 3: Pointer-events-none Veil (Downward linear gradient + vignette) */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `
            linear-gradient(to bottom, rgba(11, 10, 9, 0.2) 20%, rgba(11, 10, 9, 0.94) 100%),
            radial-gradient(circle at 60% 40%, transparent 40%, rgba(11, 10, 9, 0.7) 100%)
          `
        }}
      />

      {/* Layer 4: Foreground Content (Capped at 1152px with clamp gutter) */}
      <div className="relative z-20 mx-auto w-full max-w-[1152px] px-[clamp(20px,5vw,64px)]">
        {/* Hairline-ruled mono metadata row */}
        <div className="flex items-center gap-3 border-b border-hairline pb-4 text-white/75 font-mono text-[11px] uppercase tracking-[0.1em]">
          <span>ODYSSEIA</span>
          <span className="text-muted">·</span>
          <span>LUNAR SOUTH POLE</span>
          <span className="text-muted">·</span>
          <span>LANDING SITE PLANNER</span>
        </div>

        {/* Headline with per-character rising animation */}
        <div className="pt-6 pb-6">
          <h1
            className="flex flex-wrap gap-x-5 font-sans font-light tracking-[-0.05em] leading-[0.82] text-ink overflow-hidden"
            style={{ fontSize: 'clamp(4.5rem, 16vw, 14rem)' }}
          >
            {words.map((w, wIdx) => (
              <span key={wIdx} className="inline-flex overflow-hidden">
                {w.text.split('').map((char, cIdx) => {
                  const delay = (charCount++) * 42;
                  return (
                    <span
                      key={cIdx}
                      className={`inline-block transition-transform duration-700 ease-out ${
                        w.isAmber ? 'text-amber' : 'text-ink'
                      }`}
                      style={{
                        transform: introCleared ? 'translateY(0)' : 'translateY(0.32em)',
                        transitionDelay: `${delay}ms`
                      }}
                    >
                      {char}
                    </span>
                  );
                })}
              </span>
            ))}
          </h1>
        </div>

        {/* Narrative Paragraph (38ch) & Action Buttons */}
        <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2 items-end">
          <p
            className="font-sans font-light text-[15px] leading-[1.7] text-muted"
            style={{ maxWidth: '38ch' }}
          >
            At the Moon’s South Pole, ten meters separates continuous illumination from sub-50K eternal darkness. Odysseia simulates real-time Sun and Earth trajectories against actual LOLA topography to evaluate landing viability.
          </p>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <button
              onClick={onEnterApp}
              className="rounded-none bg-amber px-6 py-3 font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-ground transition-colors hover:bg-amber-gold active:bg-amber-pressed focus:outline-none"
            >
              Enter Mission Control
            </button>
            <a
              href="#peril"
              className="rounded-none border border-hairline bg-transparent px-5 py-3 font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-ink transition-colors hover:border-muted hover:bg-panel focus:outline-none"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
