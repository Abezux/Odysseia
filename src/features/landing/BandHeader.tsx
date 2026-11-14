import React from 'react';

interface BandHeaderProps {
  eyebrow: string;
  headline: string;
  lede: string;
}

export function BandHeader({ eyebrow, headline, lede }: BandHeaderProps): React.JSX.Element {
  return (
    <div className="w-full space-y-5 pb-10">
      {/* Eyebrow & Flexing Hairline */}
      <div className="flex items-center gap-4">
        <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          {eyebrow}
        </span>
        <div className="h-[1px] w-full bg-hairline" />
      </div>

      {/* Two-Column Head (1 column under 820px) */}
      <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-2 md:gap-12">
        <h2
          className="font-sans font-light text-ink tracking-[-0.04em] leading-[1.05]"
          style={{
            fontSize: 'clamp(2rem, 4.6vw, 3.6rem)',
            maxWidth: '20ch'
          }}
        >
          {headline}
        </h2>
        <p className="font-sans font-light text-[15px] leading-[1.7] text-muted">
          {lede}
        </p>
      </div>
    </div>
  );
}
