import React, { useEffect, useRef } from 'react';
import { BandHeader } from './BandHeader';

export function BandVerdict(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      canvas.height = Math.floor(180 * dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const rows = 4;
    const cols = 52;
    const sites = ['SHACKLETON RIM', 'MALAPERT PLATEAU', 'CONNECTING RIDGE', 'DE GERLACHE RIM'];

    // Generate deterministic annual scores
    const grid: number[][] = [];
    for (let r = 0; r < rows; r++) {
      const rowVals: number[] = [];
      for (let c = 0; c < cols; c++) {
        // Polar seasonal variation
        const seasonal = Math.sin((c / cols) * Math.PI * 2 - (r * 0.4));
        const baseScore = r === 0 ? 0.72 : r === 1 ? 0.65 : r === 2 ? 0.52 : 0.44;
        const score = Math.max(0.08, Math.min(0.96, baseScore + seasonal * 0.22));
        rowVals.push(score);
      }
      grid.push(rowVals);
    }

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animId: number;
    const startTime = performance.now();

    const render = (now: number) => {
      if (isVisible) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const t = isReduced ? 0 : (now - startTime) * 0.0004;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const w = canvas.width;
          const h = canvas.height;
          const labelW = 120 * dpr;
          const padY = 20 * dpr;
          const cellW = (w - labelW - 16 * dpr) / cols;
          const cellH = (h - padY * 2) / rows;

          // Best window marker box position
          const bestRow = 0; // Shackleton Rim
          const bestStartCol = 38 + Math.floor((Math.sin(t) * 0.5 + 0.5) * 4);
          const bestSpan = 4;

          // Render Heatmap cells
          for (let r = 0; r < rows; r++) {
            const y = padY + r * cellH;

            // Row site label
            ctx.fillStyle = 'rgba(255, 240, 220, 0.4)';
            ctx.font = `${9 * dpr}px 'JetBrains Mono', monospace`;
            ctx.textBaseline = 'middle';
            ctx.fillText(sites[r], 8 * dpr, y + cellH / 2);

            for (let c = 0; c < cols; c++) {
              const x = labelW + c * cellW;
              const score = grid[r][c];

              // Amber cell alpha = score
              ctx.fillStyle = `rgba(245, 165, 36, ${score * 0.85})`;
              ctx.fillRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
            }
          }

          // Stroked marker box around optimal window
          const boxX = labelW + bestStartCol * cellW;
          const boxY = padY + bestRow * cellH;
          const boxW = bestSpan * cellW;
          const boxH = cellH;

          ctx.strokeStyle = '#F5A524';
          ctx.lineWidth = 1.5 * dpr;
          ctx.strokeRect(boxX, boxY, boxW, boxH);
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

  const stats = [
    {
      leadingDigit: '0.',
      trailing: '0018°',
      caption: 'Sun Elevation RMSE vs NASA JPL Horizons'
    },
    {
      leadingDigit: '0.',
      trailing: '0219°',
      caption: 'Earth Elevation RMSE vs NASA JPL Horizons'
    },
    {
      leadingDigit: '2',
      trailing: '0m',
      caption: 'LOLA Laser Altimeter DEM Resolution'
    },
    {
      leadingDigit: '1',
      trailing: '9',
      caption: 'Curated Lunar South Pole & Heritage Sites'
    }
  ];

  return (
    <section id="verdict" className="relative z-10 w-full bg-transparent py-24 select-none">
      <div className="mx-auto max-w-[1152px] px-[clamp(20px,5vw,64px)]">
        <BandHeader
          eyebrow="04 · Verdict"
          headline="Uncover the launch windows where power and communication align."
          lede="Compare candidate sites and departure epochs side by side. Odysseia calculates quantitative trade-offs—illuminated hours gained versus comms blackout duration—so mission planners can commit with confidence."
        />

        {/* Full-width Canvas Heatmap */}
        <div className="relative mb-12 w-full border border-hairline bg-secondary-ground overflow-hidden p-3">
          <div className="flex items-center justify-between border-b border-hairline-subtle pb-2 mb-2 font-mono text-[11px] uppercase tracking-[0.1em]">
            <span className="text-muted">1-YEAR SYNODIC SWEEP · 52 WEEKS</span>
            <span className="text-amber">BEST WINDOW: SHACKLETON RIM · WEEK 40-44 (SCORE 88/100)</span>
          </div>

          <canvas ref={canvasRef} className="h-[180px] w-full pointer-events-none" />
        </div>

        {/* Four-track stat row on 1px gaps over hairline background */}
        <div className="grid grid-cols-1 gap-[1px] bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between bg-secondary-ground p-6 space-y-3"
            >
              <div
                className="font-sans font-light tracking-[-0.04em] text-ink"
                style={{ fontSize: 'clamp(2.2rem, 5vw, 3.4rem)' }}
              >
                <span className="text-amber">{stat.leadingDigit}</span>
                <span>{stat.trailing}</span>
              </div>
              <div className="font-sans font-light text-[12.5px] leading-[1.5] text-muted">
                {stat.caption}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
