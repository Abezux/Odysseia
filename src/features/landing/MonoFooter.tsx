import React from 'react';

export function MonoFooter(): React.JSX.Element {
  return (
    <footer className="relative z-10 w-full border-t border-hairline bg-transparent py-10 select-none">
      <div className="mx-auto flex w-full max-w-[1152px] flex-col items-start justify-between gap-6 px-[clamp(20px,5vw,64px)] sm:flex-row sm:items-center">
        {/* Left: Project identity */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          <span className="text-ink">ODYSSEIA</span>
          <span>·</span>
          <span>LUNAR SOUTH POLE PLANNER</span>
          <span>·</span>
          <span>2026 NASA SPACE APPS</span>
        </div>

        {/* Right: Data Sources & Link */}
        <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          <span>NASA JPL HORIZONS</span>
          <span>·</span>
          <span>LOLA ALTIMETRY</span>
          <span>·</span>
          <a
            href="https://github.com/Abezux/Odysseia"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline decoration-hairline transition-colors hover:text-amber"
          >
            GITHUB REPOSITORY
          </a>
        </div>
      </div>
    </footer>
  );
}
