import React from 'react';

interface LandingNavProps {
  onEnterApp: () => void;
}

export function LandingNav({ onEnterApp }: LandingNavProps): React.JSX.Element {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-hairline bg-ground/85 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-[1152px] items-center justify-between px-[clamp(20px,5vw,64px)]">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-normal tracking-[0.1em] text-ink uppercase">
            ODYSSEIA
          </span>
          <span className="hidden font-mono text-[11px] tracking-[0.1em] text-muted sm:inline-block">
            · LUNAR SOUTH POLE
          </span>
        </div>

        {/* Anchors */}
        <div className="hidden md:flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          <a href="#peril" className="transition-colors hover:text-ink">
            01 · Peril
          </a>
          <a href="#dilemma" className="transition-colors hover:text-ink">
            02 · Dilemma
          </a>
          <a href="#odysseia" className="transition-colors hover:text-ink">
            03 · Odysseia
          </a>
          <a href="#verdict" className="transition-colors hover:text-ink">
            04 · Verdict
          </a>
          <a href="#faq" className="transition-colors hover:text-ink">
            FAQ
          </a>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={onEnterApp}
            className="rounded-none bg-amber px-3.5 py-1.5 font-mono text-[11px] font-normal uppercase tracking-[0.1em] text-ground transition-colors hover:bg-amber-gold active:bg-amber-pressed focus:outline-none"
          >
            Enter Mission Control
          </button>
        </div>
      </div>
    </nav>
  );
}
