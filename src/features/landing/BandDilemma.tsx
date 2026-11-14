import React, { useEffect, useRef, useState } from 'react';
import { BandHeader } from './BandHeader';

export function BandDilemma(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [readout, setReadout] = useState({ delayDays: '0.0', illumPct: '82' });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let isVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );
    observer.observe(canvas);

    const resize = () => {
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animId: number;
    const startTime = performance.now();

    const barCount = 72;
    const windowWidth = 12;

    const render = (now: number) => {
      if (isVisible) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const t = isReduced ? 0 : (now - startTime) * 0.0003;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const w = canvas.width;
          const h = canvas.height;
          const padY = 32 * dpr;
          const barW = (w - 32 * dpr) / barCount;

          // Drift progress 0 to 1 across cycle
          const cycleProgress = (t % 1);
          const maxShift = barCount - windowWidth;
          const boxStart = Math.floor(cycleProgress * maxShift);
          const boxEnd = boxStart + windowWidth;

          // As delay increases, illumination drops from 82% to 14%
          const currentIllum = Math.round(82 - cycleProgress * 68);
          const currentDelay = (cycleProgress * 5.8).toFixed(1);

          setReadout({ delayDays: currentDelay, illumPct: String(currentIllum) });

          // Draw bars
          for (let i = 0; i < barCount; i++) {
            const x = 16 * dpr + i * barW;
            const u = i / (barCount - 1);
            // Envelope * summed oscillations
            const env = Math.sin(Math.PI * u);
            const osc = 0.55 + 0.25 * Math.cos(i * 0.28) + 0.15 * Math.sin(i * 0.65);
            let barH = Math.max(0.1, env * osc) * (h - padY * 2);

            const isSelected = i >= boxStart && i < boxEnd;

            if (isSelected) {
              // Lifted clear of envelope inside marker box
              // Dims if shifted into dark zone
              const dimFactor = Math.max(0.18, 1.0 - cycleProgress * 0.82);
              barH = Math.max(14 * dpr, barH * dimFactor + 22 * dpr);

              ctx.fillStyle = '#F5A524';
            } else {
              ctx.fillStyle = 'rgba(255, 240, 220, 0.16)';
            }

            const y = h - padY - barH;
            ctx.fillRect(x + 1 * dpr, y, barW - 2 * dpr, barH);
          }

          // Stroked Marker Box around selected run
          const boxX = 16 * dpr + boxStart * barW;
          const boxW = windowWidth * barW;
          const boxY = padY * 0.75;
          const boxH = h - padY * 1.5;

          ctx.strokeStyle = 'rgba(245, 165, 36, 0.85)';
          ctx.lineWidth = 1 * dpr;
          ctx.strokeRect(boxX, boxY, boxW, boxH);

          // Marker top tick
          ctx.fillStyle = '#F5A524';
          ctx.fillRect(boxX, boxY, boxW, 2 * dpr);
        }
      }

      if (!isReduced) {
        animId = requestAnimationFrame(render);
      }
    };

    if (isReduced) {
      render(startTime);
    } else {
      animId = requestAnimationFrame(render);
    }

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <section id="dilemma" className="w-full bg-ground py-24 select-none">
      <div className="mx-auto max-w-[1152px] px-[clamp(20px,5vw,64px)]">
        <BandHeader
          eyebrow="02 · Dilemma"
          headline="When launch dates slip, viable sites vanish."
          lede="Mission development rarely proceeds on a fixed schedule. A 72-hour launch delay can rotate a sunlit polar plateau into deep shadow, cutting solar array generation and turning an operational window into a mission-ending blackout."
        />

        {/* Full-width bordered panel holding the 72-bar timeline canvas */}
        <div
          className="relative w-full border border-hairline bg-secondary-ground overflow-hidden"
          style={{ height: 'clamp(200px, 32vw, 340px)' }}
        >
          <canvas ref={canvasRef} className="h-full w-full pointer-events-none" />

          {/* Pinned mono caption bottom-left */}
          <div className="pointer-events-none absolute bottom-3.5 left-4 z-10 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            EXAMPLE SCENARIO · SHACKLETON RIM RIDGE
          </div>

          {/* Live amber readout bottom-right */}
          <div className="pointer-events-none absolute bottom-3.5 right-4 z-10 font-mono text-[11px] uppercase tracking-[0.1em] text-amber">
            DELAY +{readout.delayDays}D · ILLUMINATION {readout.illumPct}%
          </div>
        </div>
      </div>
    </section>
  );
}
