import React, { useEffect, useRef, useState } from 'react';
import { BandHeader } from './BandHeader';

export function BandOdysseia(): React.JSX.Element {
  const globeCanvasRef = useRef<HTMLCanvasElement>(null);
  const skylineCanvasRef = useRef<HTMLCanvasElement>(null);
  const skyDialCanvasRef = useRef<HTMLCanvasElement>(null);

  const [parallaxY, setParallaxY] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

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
      className="relative w-full overflow-hidden bg-ground py-24 select-none"
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

        {/* Product Screen Recording Panel */}
        <div className="mb-10 w-full border border-hairline bg-secondary-ground overflow-hidden">
          <div className="relative aspect-[16/9] w-full max-h-[460px] bg-panel flex items-center justify-center">
            {/* Visual preview banner with real UI components screenshot / animated frame */}
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-amber">
                ODYSSEIA MISSION CONTROL INTERFACE
              </div>
              <p className="max-w-md font-sans font-light text-xs text-muted">
                3D Moon Globe, LOLA 20m Local Elevation Mesh, Polar Sky Dial, and Synodic Month Elevation Strip running simultaneously in the browser.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <span className="h-1.5 w-1.5 bg-amber" />
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink">
                  LIVE 60 FPS WEBGL RUNTIME
                </span>
              </div>
            </div>
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
