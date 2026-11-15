import React, { useEffect, useRef, useState } from 'react';
import { BandHeader } from './BandHeader';

interface BandOdysseiaProps {
  onEnterApp?: () => void;
}

interface TabPreviewItem {
  id: 'globe' | 'terrain' | 'horizon' | 'compare';
  label: string;
  badge: string;
  title: string;
  description: string;
  image: string;
  fallback: string;
}

const PREVIEW_TABS: TabPreviewItem[] = [
  {
    id: 'globe',
    label: 'Moon Globe',
    badge: '3D ORBITAL SIMULATION',
    title: '3D Lunar Globe & Astrometric Context',
    description:
      'Sub-solar terminator simulation, real-time Earth line-of-sight tracking, and 27.32-day sidereal orbit nodal trajectory.',
    image: `${import.meta.env.BASE_URL}preview/globe.webp`,
    fallback: `${import.meta.env.BASE_URL}preview/globe.png`
  },
  {
    id: 'terrain',
    label: 'Local Terrain',
    badge: '20M/PX LASER ALTIMETRY',
    title: 'Authentic LOLA 20m/px Elevation Mesh',
    description:
      'Polar digital elevation models from NASA LOLA LDEM 80°S altimetry with dynamic hillshading, slope variance, and lander mast elevation.',
    image: `${import.meta.env.BASE_URL}preview/terrain.webp`,
    fallback: `${import.meta.env.BASE_URL}preview/terrain.png`
  },
  {
    id: 'horizon',
    label: 'Horizon Skyline',
    badge: '360° TOPOCENTRIC PROFILE',
    title: 'First-Person 360° Panoramic Skyline',
    description:
      'Raycasted topographic horizon profiles showing exact solar elevation angles and Earth line-of-sight clearing crater ridges.',
    image: `${import.meta.env.BASE_URL}preview/horizon.webp`,
    fallback: `${import.meta.env.BASE_URL}preview/horizon.png`
  },
  {
    id: 'compare',
    label: 'Compare Matrix',
    badge: 'MULTI-SITE BENCHMARKING',
    title: 'Multi-Site Artemis Comparative Analysis',
    description:
      'Side-by-side radar matrices and quantitative diffs for continuous illumination %, comms blackout duration, and slope hazard.',
    image: `${import.meta.env.BASE_URL}preview/compare.webp`,
    fallback: `${import.meta.env.BASE_URL}preview/compare.png`
  }
];

export function BandOdysseia({ onEnterApp }: BandOdysseiaProps = {}): React.JSX.Element {
  const globeCanvasRef = useRef<HTMLCanvasElement>(null);
  const skylineCanvasRef = useRef<HTMLCanvasElement>(null);
  const skyDialCanvasRef = useRef<HTMLCanvasElement>(null);

  const [parallaxY, setParallaxY] = useState(0);
  const [activePreviewTab, setActivePreviewTab] = useState<'globe' | 'terrain' | 'horizon' | 'compare'>('globe');
  const sectionRef = useRef<HTMLElement>(null);

  const currentTab = PREVIEW_TABS.find((t) => t.id === activePreviewTab) || PREVIEW_TABS[0];

  useEffect(() => {
    // Parallax scroll listener
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)));
      setParallaxY(-progress * 6);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let isVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );

    if (globeCanvasRef.current?.parentElement) {
      observer.observe(globeCanvasRef.current.parentElement);
    }

    const canvases = [globeCanvasRef.current, skylineCanvasRef.current, skyDialCanvasRef.current];
    canvases.forEach((c) => {
      if (!c) return;
      c.width = Math.floor(c.clientWidth * dpr);
      c.height = Math.floor(100 * dpr);
    });

    let animId: number;
    const start = performance.now();

    const loop = (now: number) => {
      if (isVisible) {
        const t = (now - start) * 0.001;

        // 1. Globe: Terminator line sweeping across a sphere
        const gc = globeCanvasRef.current;
        if (gc) {
          const ctx = gc.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, gc.width, gc.height);
            const cx = gc.width / 2;
            const cy = gc.height / 2;
            const r = 38 * dpr;

            // Globe base
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = '#12110F';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 240, 220, 0.2)';
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();

            // Sweeping terminator ellipse
            const sweep = Math.sin(t * 0.8); // -1 to 1
            ctx.beginPath();
            ctx.ellipse(cx, cy, Math.abs(sweep) * r, r, 0, 0, Math.PI * 2);
            ctx.fillStyle = sweep > 0 ? 'rgba(255, 240, 220, 0.12)' : 'rgba(11, 10, 9, 0.6)';
            ctx.fill();
            ctx.strokeStyle = '#F5A524';
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();

            // Polar marker dot
            ctx.beginPath();
            ctx.arc(cx, cy + r * 0.85, 2.5 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#F5A524';
            ctx.fill();
          }
        }

        // 2. Skyline: Horizon silhouette with lander-mast view
        const sc = skylineCanvasRef.current;
        if (sc) {
          const ctx = sc.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, sc.width, sc.height);
            const w = sc.width;
            const h = sc.height;

            // Horizon profile line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 240, 220, 0.25)';
            ctx.lineWidth = 1.2 * dpr;
            ctx.moveTo(0, h * 0.68);
            ctx.lineTo(w * 0.3, h * 0.52);
            ctx.lineTo(w * 0.5, h * 0.64);
            ctx.lineTo(w * 0.75, h * 0.48);
            ctx.lineTo(w, h * 0.62);
            ctx.stroke();

            // Smooth terrain fill
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 240, 220, 0.04)';
            ctx.fill();

            // Lander mast at center
            const mastX = w * 0.5;
            const mastY = h * 0.64;
            ctx.beginPath();
            ctx.strokeStyle = '#F4EFE8';
            ctx.lineWidth = 1.5 * dpr;
            ctx.moveTo(mastX, mastY);
            ctx.lineTo(mastX, mastY - 18 * dpr);
            ctx.stroke();

            // Sun disc tracking along skyline
            const sunX = w * (0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.6)));
            const sunY = h * 0.44 + 8 * dpr * Math.cos(t * 0.6);
            ctx.beginPath();
            ctx.arc(sunX, sunY, 3 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#F5A524';
            ctx.fill();
          }
        }

        // 3. Sky Dial: Polar dial with terrain-mask arc sweeping
        const dc = skyDialCanvasRef.current;
        if (dc) {
          const ctx = dc.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, dc.width, dc.height);
            const cx = dc.width / 2;
            const cy = dc.height / 2;
            const r = 38 * dpr;

            // Concentric rings (0°, 30°, 60°)
            [r, r * 0.66, r * 0.33].forEach((radius) => {
              ctx.beginPath();
              ctx.arc(cx, cy, radius, 0, Math.PI * 2);
              ctx.strokeStyle = 'rgba(255, 240, 220, 0.1)';
              ctx.lineWidth = 1 * dpr;
              ctx.stroke();
            });

            // Crosshairs
            ctx.beginPath();
            ctx.moveTo(cx - r, cy);
            ctx.lineTo(cx + r, cy);
            ctx.moveTo(cx, cy - r);
            ctx.lineTo(cx, cy + r);
            ctx.strokeStyle = 'rgba(255, 240, 220, 0.08)';
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();

            // Sweeping terrain-mask arc
            const sweepAngle = (t * 0.9) % (Math.PI * 2);
            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.85, sweepAngle, sweepAngle + 1.2);
            ctx.strokeStyle = '#F5A524';
            ctx.lineWidth = 2 * dpr;
            ctx.stroke();

            // Zenith dot
            ctx.beginPath();
            ctx.arc(cx, cy, 2 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#F4EFE8';
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
    };
  }, []);

  const features = [
    {
      title: '3D Moon Globe',
      ref: globeCanvasRef,
      desc: 'Rotatable lunar sphere with live IAU 2009 WGCCRE day/night terminator shading and 19 curated interactive candidate pins.'
    },
    {
      title: 'Lander Skyline Panorama',
      ref: skylineCanvasRef,
      desc: '360° cylindrical skyline view from a 2-meter lander mast, showing raycasted terrain silhouettes and accurate celestial phase disks.'
    },
    {
      title: 'Topocentric Sky Dial',
      ref: skyDialCanvasRef,
      desc: '2D SVG polar projection dial plotting terrain obstacle masks against topocentric Sun and Earth elevation tracks.'
    }
  ];

  return (
    <section
      ref={sectionRef}
      id="odysseia"
      className="relative z-10 w-full overflow-hidden bg-transparent py-24 select-none"
    >
      {/* Background: Eyes-Open Astronaut with slow parallax */}
      <picture className="absolute inset-0 h-full w-full pointer-events-none">
        <source
          media="(max-width: 768px)"
          srcSet={`${import.meta.env.BASE_URL}odysseia-astronaut-open-portrait.webp`}
          type="image/webp"
        />
        <img
          src={`${import.meta.env.BASE_URL}odysseia-astronaut-open.webp`}
          alt="Astronaut with open eyes seeing through lander instruments"
          className="h-full w-full object-cover object-right opacity-30 will-change-transform"
          style={{
            transform: `translateY(${parallaxY}%) scale(1.04)`,
            objectPosition: 'right center'
          }}
          loading="lazy"
        />
      </picture>

      {/* Dark Veil overlay so text stays readable */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: `
            linear-gradient(to bottom, rgba(11, 10, 9, 0.92) 0%, rgba(11, 10, 9, 0.75) 50%, rgba(11, 10, 9, 0.95) 100%),
            radial-gradient(circle at 75% 50%, transparent 20%, rgba(11, 10, 9, 0.85) 80%)
          `
        }}
      />

      {/* Content Container */}
      <div className="relative z-20 mx-auto max-w-[1152px] px-[clamp(20px,5vw,64px)]">
        <BandHeader
          eyebrow="03 · Odysseia"
          headline="See what the lander will see before launch."
          lede="Instead of interpreting disconnected data tables, Odysseia transforms complex astrometric matrices into physical perspectives: the global terminator, 3D surface relief, and the horizon skyline."
        />

        {/* Interactive Tabbed Product Preview Frame (Option C) */}
        <div className="mb-12 w-full border border-hairline bg-secondary-ground overflow-hidden shadow-2xl">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-hairline bg-ground/80 px-4 py-2.5 backdrop-blur-md gap-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber" />
              </span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-ink">
                ODYSSEIA MISSION CONTROL INTERFACE
              </span>
              <span className="hidden sm:inline-block font-mono text-[10px] text-amber/90 bg-amber/10 px-2 py-0.5 rounded border border-amber/25">
                {currentTab.badge}
              </span>
            </div>

            {/* Tab Switcher Pills */}
            <div
              role="tablist"
              aria-label="Mission Control Preview Tabs"
              className="flex items-center gap-1 rounded-lg border border-hairline bg-surface/70 p-1"
            >
              {PREVIEW_TABS.map((tab) => {
                const isActive = tab.id === activePreviewTab;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => setActivePreviewTab(tab.id)}
                    className={`rounded-md px-3 py-1 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber text-amber-text font-semibold shadow-sm'
                        : 'text-muted hover:text-ink hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Screenshot Display Frame */}
          <div className="relative aspect-[16/9] w-full max-h-[520px] bg-[#0B0A09] overflow-hidden group">
            <picture>
              <source srcSet={currentTab.image} type="image/webp" />
              <img
                key={currentTab.id}
                src={currentTab.fallback}
                alt={currentTab.title}
                className="h-full w-full object-cover object-top transition-opacity duration-300 animate-fadeIn"
                loading="lazy"
              />
            </picture>

            {/* Subtle Gradient Vignette Over Bottom Edge */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0B0A09]/80 to-transparent" />
          </div>

          {/* Caption & Metadata Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-hairline bg-ground/90 px-4 py-3">
            <div className="min-w-0">
              <h4 className="font-mono text-xs font-semibold text-ink">
                {currentTab.title}
              </h4>
              <p className="mt-0.5 font-sans text-xs text-muted leading-relaxed max-w-2xl">
                {currentTab.description}
              </p>
            </div>

            {onEnterApp && (
              <button
                type="button"
                onClick={onEnterApp}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-none bg-white/5 border border-hairline px-3.5 py-1.5 font-mono text-xs uppercase tracking-wider text-ink hover:text-amber hover:border-amber/40 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <span>Launch Live System</span>
                <span className="text-amber">→</span>
              </button>
            )}
          </div>
        </div>

        {/* Three explicit tracks (3 -> 1 at 820px) */}
        <div className="grid grid-cols-1 gap-[1px] bg-hairline md:grid-cols-3">
          {features.map((f, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-start bg-secondary-ground p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-hairline-subtle pb-3">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  0{idx + 1}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-amber">
                  PROJECTION
                </span>
              </div>

              <div className="flex justify-center py-2">
                <canvas
                  ref={f.ref}
                  className="h-[100px] w-[180px] pointer-events-none"
                />
              </div>

              <h3 className="font-sans font-light text-[17px] text-ink">
                {f.title}
              </h3>

              <p className="font-sans font-light text-[13px] leading-[1.65] text-muted">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Data sources chip row */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          <span>DATA CITATIONS:</span>
          <div className="flex flex-wrap gap-4 text-ink">
            <span>NASA JPL HORIZONS API</span>
            <span className="text-muted">·</span>
            <span>LOLA LDEM 20M/PX LASER ALTIMETRY</span>
            <span className="text-muted">·</span>
            <span>IAU 2009 WGCCRE ROTATIONAL ELEMENTS</span>
            <span className="text-muted">·</span>
            <span>USGS ASTROGEOLOGY GAZETTEER</span>
          </div>
        </div>
      </div>
    </section>
  );
}
