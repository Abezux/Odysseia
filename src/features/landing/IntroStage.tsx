import React, { useEffect, useState } from 'react';

type IntroPhase = 'hidden' | 'in' | 'lifting' | 'fadeout' | 'gone';

export function IntroStage(): React.JSX.Element | null {
  const [phase, setPhase] = useState<IntroPhase>('hidden');

  useEffect(() => {
    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('gone');
      return;
    }

    const tIn = setTimeout(() => setPhase('in'), 220);
    const tLift = setTimeout(() => setPhase('lifting'), 1500);
    const tFade = setTimeout(() => setPhase('fadeout'), 2050);
    const tGone = setTimeout(() => setPhase('gone'), 2600);

    return () => {
      clearTimeout(tIn);
      clearTimeout(tLift);
      clearTimeout(tFade);
      clearTimeout(tGone);
    };
  }, []);

  if (phase === 'gone') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-ground transition-opacity duration-500 pointer-events-none select-none ${
        phase === 'fadeout' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        visibility: phase === 'fadeout' ? 'hidden' : 'visible'
      }}
    >
      <div
        className="font-sans font-light text-ink transition-all duration-700 ease-out"
        style={{
          fontSize: 'clamp(2.2rem, 7vw, 5rem)',
          letterSpacing: '-0.05em',
          transform:
            phase === 'hidden'
              ? 'translateY(14px)'
              : phase === 'lifting' || phase === 'fadeout'
              ? 'translateY(-14px)'
              : 'translateY(0)',
          opacity: phase === 'hidden' || phase === 'fadeout' ? 0 : 1
        }}
      >
        odysseia
      </div>
    </div>
  );
}
