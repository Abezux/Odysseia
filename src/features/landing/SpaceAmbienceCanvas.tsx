import React, { useEffect, useRef } from 'react';

interface Star {
  x: number; // 0..1
  y: number; // 0..1
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  isAmber: boolean;
  layer: number; // 0: distant, 1: mid, 2: near
}

interface ShootingStar {
  x: number;
  y: number;
  dx: number;
  dy: number;
  length: number;
  duration: number;
  elapsed: number;
}

export function SpaceAmbienceCanvas(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let shootingStar: ShootingStar | null = null;
    let nextShootingStarTime = performance.now() + 8000 + Math.random() * 6000;
    let rafId: number | null = null;
    let lastTime = performance.now();
    let scrollY = window.scrollY;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    // Scale devicePixelRatio to max 1.5 for performance
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);

    const initStars = (w: number, h: number) => {
      // 90 to 140 stars scaled to area at 1080p
      const targetCount = Math.round(110 * ((w * h) / (1920 * 1080)));
      const count = Math.max(65, Math.min(145, targetCount));

      const newStars: Star[] = [];
      for (let i = 0; i < count; i++) {
        const isAmber = Math.random() < 0.14; // 14% pale amber
        const layer = Math.random() < 0.5 ? 0 : Math.random() < 0.8 ? 1 : 2;
        const size = layer === 0 ? 1.0 : layer === 1 ? 1.4 : 1.8;
        newStars.push({
          x: Math.random(),
          y: Math.random(),
          size,
          baseAlpha: 0.25 + Math.random() * 0.5,
          twinkleSpeed: 0.8 + Math.random() * 1.6,
          twinklePhase: Math.random() * Math.PI * 2,
          isAmber,
          layer
        });
      }
      return newStars;
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      stars = initStars(width, height);

      if (prefersReducedMotion) {
        drawStatic();
      }
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
      if (prefersReducedMotion) {
        drawStatic();
      }
    };

    const spawnShootingStar = () => {
      // Avoid spawning near hero headline (top 50% of viewport if near top of page)
      const isNearPageTop = scrollY < 500;
      const startY = isNearPageTop
        ? height * 0.55 + Math.random() * (height * 0.35)
        : Math.random() * (height * 0.7);

      const startX = Math.random() * (width * 0.8) + width * 0.1;
      const angle = (25 + Math.random() * 20) * (Math.PI / 180); // ~35 deg downward
      const speed = 750 + Math.random() * 250; // pixels per second
      const length = 80 + Math.random() * 40;

      shootingStar = {
        x: startX,
        y: startY,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        length,
        duration: 800, // 0.8s
        elapsed: 0
      };
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        ctx.fillStyle = s.isAmber ? 'rgba(245, 165, 36, 0.45)' : 'rgba(234, 230, 225, 0.5)';
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.size * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const render = (now: number) => {
      const dt = Math.min(100, now - lastTime) / 1000;
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Layer parallax scroll multipliers
      const layerScrollSpeeds = [0.015, 0.035, 0.06];

      // Draw Twinkling Stars with subtle scroll parallax
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        // Slow independent twinkle
        const twinkle = Math.sin(now * 0.001 * s.twinkleSpeed + s.twinklePhase);
        const alpha = Math.max(0.12, Math.min(0.78, s.baseAlpha + twinkle * 0.28));

        // Parallax Y offset wrapped across viewport height
        const parallaxOffset = scrollY * layerScrollSpeeds[s.layer];
        const screenY = ((s.y * height - parallaxOffset) % height + height) % height;
        const screenX = s.x * width;

        if (s.isAmber) {
          ctx.fillStyle = `rgba(245, 165, 36, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(238, 234, 228, ${alpha})`;
        }

        ctx.beginPath();
        ctx.arc(screenX, screenY, s.size * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shooting Star Handling
      if (!shootingStar && now >= nextShootingStarTime) {
        spawnShootingStar();
        nextShootingStarTime = now + 8000 + Math.random() * 6000; // 8-14s interval
      }

      if (shootingStar) {
        shootingStar.elapsed += dt * 1000;
        const progress = shootingStar.elapsed / shootingStar.duration;

        if (progress >= 1.0) {
          shootingStar = null;
        } else {
          // Move head
          const headX = shootingStar.x + (shootingStar.dx * shootingStar.elapsed) / 1000;
          const headY = shootingStar.y + (shootingStar.dy * shootingStar.elapsed) / 1000;

          // Tail point
          const angle = Math.atan2(shootingStar.dy, shootingStar.dx);
          const tailX = headX - Math.cos(angle) * shootingStar.length;
          const tailY = headY - Math.sin(angle) * shootingStar.length;

          // Fade envelope: rapid fade in (0..0.2), peak, fade out (0.6..1.0)
          let opacity = 1.0;
          if (progress < 0.2) {
            opacity = progress / 0.2;
          } else if (progress > 0.6) {
            opacity = 1.0 - (progress - 0.6) / 0.4;
          }

          const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
          grad.addColorStop(0, 'rgba(245, 165, 36, 0)');
          grad.addColorStop(0.6, `rgba(245, 165, 36, ${0.45 * opacity})`);
          grad.addColorStop(1, `rgba(255, 250, 240, ${0.85 * opacity})`);

          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(headX, headY);
          ctx.stroke();
        }
      }

      rafId = requestAnimationFrame(render);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, { passive: true });

    const handleVisibility = () => {
      if (document.hidden) {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else {
        lastTime = performance.now();
        if (!prefersReducedMotion && !rafId) {
          rafId = requestAnimationFrame(render);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    if (!prefersReducedMotion) {
      rafId = requestAnimationFrame(render);
    } else {
      drawStatic();
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
