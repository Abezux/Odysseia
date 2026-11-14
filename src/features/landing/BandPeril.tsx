import React, { useEffect, useRef } from 'react';
import { BandHeader } from './BandHeader';

export function BandPeril(): React.JSX.Element {
  const c1Ref = useRef<HTMLCanvasElement>(null);
  const c2Ref = useRef<HTMLCanvasElement>(null);
  const c3Ref = useRef<HTMLCanvasElement>(null);
  const c4Ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvases = [c1Ref.current, c2Ref.current, c3Ref.current, c4Ref.current];
    let isVisible = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.1 }
    );

    if (c1Ref.current?.parentElement) {
      observer.observe(c1Ref.current.parentElement);
    }

    // Init dimensions
    canvases.forEach((c) => {
      if (!c) return;
      c.width = Math.floor(c.clientWidth * dpr);
      c.height = Math.floor(74 * dpr);
    });

    let animId: number;
    const start = performance.now();

    const loop = (now: number) => {
      if (isVisible) {
        const t = (now - start) * 0.001;

        // Canvas 1: Grazing Sun bobbing 0-3° above jagged horizon
        const c1 = c1Ref.current;
        if (c1) {
          const ctx = c1.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, c1.width, c1.height);
            const w = c1.width;
            const h = c1.height;

            // Jagged horizon
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 240, 220, 0.25)';
            ctx.lineWidth = 1.2 * dpr;
            ctx.moveTo(0, h * 0.72);
            ctx.lineTo(w * 0.25, h * 0.65);
            ctx.lineTo(w * 0.45, h * 0.76);
            ctx.lineTo(w * 0.7, h * 0.62);
            ctx.lineTo(w, h * 0.7);
            ctx.stroke();

            // Sun bobbing near horizon (0-3 degrees)
            const sunY = h * 0.45 + h * 0.18 * Math.sin(t * 1.4);
            const sunX = w * 0.55;

            // Sun disc
            ctx.beginPath();
            ctx.arc(sunX, sunY, 3.5 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = '#F5A524';
            ctx.fill();

            // Faint ray
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(245, 165, 36, 0.2)';
            ctx.lineWidth = 1 * dpr;
            ctx.moveTo(sunX - 18 * dpr, sunY);
            ctx.lineTo(sunX + 18 * dpr, sunY);
            ctx.stroke();
          }
        }

        // Canvas 2: Crater rim shadow wedge lengthening and shortening on sine
        const c2 = c2Ref.current;
        if (c2) {
          const ctx = c2.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, c2.width, c2.height);
            const w = c2.width;
            const h = c2.height;

            // Rim crest
            const rimX = w * 0.2;
            const rimY = h * 0.3;

            // Shadow wedge extending along x
            const shadowTipX = w * 0.35 + w * 0.45 * (0.5 + 0.5 * Math.sin(t * 1.2));

            ctx.beginPath();
            ctx.moveTo(rimX, rimY);
            ctx.lineTo(shadowTipX, h * 0.85);
            ctx.lineTo(rimX, h * 0.85);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 240, 220, 0.08)';
            ctx.fill();

            // Rim line
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(255, 240, 220, 0.3)';
            ctx.lineWidth = 1.2 * dpr;
            ctx.moveTo(w * 0.05, h * 0.65);
            ctx.lineTo(rimX, rimY);
            ctx.lineTo(w * 0.4, h * 0.85);
            ctx.stroke();
          }
        }

        // Canvas 3: Earth dot bobbing behind ridge mask with blinking signal ring
        const c3 = c3Ref.current;
        if (c3) {
          const ctx = c3.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, c3.width, c3.height);
            const w = c3.width;
            const h = c3.height;

            const earthX = w * 0.48;
            const earthY = h * 0.42 + h * 0.18 * Math.sin(t * 1.1);
            const ridgeY = h * 0.52;
            const isClear = earthY < ridgeY;

            // Signal wave when clear
            if (isClear) {
              const ringR = ((t * 22 * dpr) % (14 * dpr)) + 4 * dpr;
              ctx.beginPath();
              ctx.arc(earthX, earthY, ringR, 0, Math.PI * 2);
              ctx.strokeStyle = `rgba(245, 165, 36, ${Math.max(0, 1 - ringR / (18 * dpr)) * 0.6})`;
              ctx.lineWidth = 1 * dpr;
              ctx.stroke();
            }

            // Earth dot
            ctx.beginPath();
            ctx.arc(earthX, earthY, 3 * dpr, 0, Math.PI * 2);
            ctx.fillStyle = isClear ? '#F4EFE8' : '#8A847B';
            ctx.fill();

            // Foreground Ridge Mask
            ctx.beginPath();
            ctx.moveTo(0, h * 0.8);
            ctx.lineTo(w * 0.35, ridgeY);
            ctx.lineTo(w * 0.65, ridgeY + 8 * dpr);
            ctx.lineTo(w, h * 0.7);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.fillStyle = '#12110F';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 240, 220, 0.2)';
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();
          }
        }

        // Canvas 4: Two-row block grid with oscillating alpha and permanently dark cells
        const c4 = c4Ref.current;
        if (c4) {
          const ctx = c4.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, c4.width, c4.height);
            const w = c4.width;
            const h = c4.height;
            const cols = 6;
            const rows = 2;
            const pad = 3 * dpr;
            const cellW = (w - (cols + 1) * pad) / cols;
            const cellH = (h - (rows + 1) * pad) / rows;

            for (let r = 0; r < rows; r++) {
              for (let col = 0; col < cols; col++) {
                const x = pad + col * (cellW + pad);
                const y = pad + r * (cellH + pad);

                // Cells (0, 3) and (1, 1) permanently dark
                const isPermDark = (r === 0 && col === 3) || (r === 1 && col === 1);
                let alpha = 0.05;
                if (!isPermDark) {
                  const phase = col * 0.8 + r * 1.5;
                  alpha = 0.12 + 0.35 * Math.max(0, Math.sin(t * 1.6 + phase));
                }

                ctx.fillStyle = `rgba(255, 240, 220, ${alpha})`;
                ctx.fillRect(x, y, cellW, cellH);
                ctx.strokeStyle = 'rgba(255, 240, 220, 0.08)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, cellW, cellH);
              }
            }
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

  const tiles = [
    {
      index: '01',
      title: 'Grazing Sunlight',
      ref: c1Ref,
      lines: [
        'The Sun never rises higher than 1.5° to 3°.',
        'Rays skim along the horizontal surface plane,',
        'demanding elevated or vertical solar arrays.'
      ]
    },
    {
      index: '02',
      title: 'Crater Shadows',
      ref: c2Ref,
      lines: [
        'Massive 4-kilometer crater walls cast shadows',
        'that stretch tens of kilometers over terrain,',
        'plunging equipment into sub-50 Kelvin cold.'
      ]
    },
    {
      index: '03',
      title: 'Libration Silence',
      ref: c3Ref,
      lines: [
        'Earth wobbles along the horizon in a loop.',
        'Local mountains periodically cut off signals,',
        'causing multi-day communication blackouts.'
      ]
    },
    {
      index: '04',
      title: 'Eternal Traps',
      ref: c4Ref,
      lines: [
        'Permanently Shadowed Regions trap water ice,',
        'but offer zero solar power or direct link.',
        'A few meters decides mission survival.'
      ]
    }
  ];

  return (
    <section id="peril" className="w-full bg-ground py-24 select-none">
      <div className="mx-auto max-w-[1152px] px-[clamp(20px,5vw,64px)]">
        <BandHeader
          eyebrow="01 · Peril"
          headline="The south pole is a landscape of extremes."
          lede="The Moon’s 1.54° axial tilt creates extreme lighting geometry: elevated peaks of near-permanent sunlight sit directly beside deep, permanently shadowed craters containing billions of tons of water ice."
        />

        {/* Four explicit tracks separated by 1px gaps over hairline background */}
        {/* 4 columns -> 2 at 1000px -> 1 at 560px */}
        <div className="grid grid-cols-1 gap-[1px] bg-hairline sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <div
              key={tile.index}
              className="flex flex-col justify-start bg-secondary-ground p-6 space-y-4"
            >
              {/* Canvas row & index */}
              <div className="flex items-start justify-between">
                <canvas
                  ref={tile.ref}
                  className="h-[74px] w-[140px] pointer-events-none"
                />
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
                  {tile.index}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-sans font-light text-[17px] text-ink">
                {tile.title}
              </h3>

              {/* 3-line description with exact same line count in every tile */}
              <div className="font-sans font-light text-[13px] leading-[1.65] text-muted space-y-0.5">
                <p>{tile.lines[0]}</p>
                <p>{tile.lines[1]}</p>
                <p>{tile.lines[2]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
