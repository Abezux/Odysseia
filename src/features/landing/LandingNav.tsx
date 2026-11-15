import React, { useEffect, useState } from 'react';

interface LandingNavProps {
  onEnterApp: () => void;
}

const NAV_ITEMS = [
  { href: '#peril', label: '01 · Peril' },
  { href: '#dilemma', label: '02 · Dilemma' },
  { href: '#odysseia', label: '03 · Odysseia' },
  { href: '#verdict', label: '04 · Verdict' },
  { href: '#faq', label: 'FAQ' }
];

export function LandingNav({ onEnterApp }: LandingNavProps): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 140;
      for (let i = NAV_ITEMS.length - 1; i >= 0; i--) {
        const el = document.querySelector(NAV_ITEMS[i].href);
        if (el) {
          const top = (el as HTMLElement).offsetTop;
          if (scrollPos >= top) {
            setActiveSection(NAV_ITEMS[i].href);
            return;
          }
        }
      }
      setActiveSection('');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      role="navigation"
      aria-label="Main Navigation"
      className="fixed top-0 left-0 right-0 z-50 h-[68px] border-b border-hairline bg-ground/90 backdrop-blur-md transition-colors"
    >
      <div className="mx-auto flex h-full max-w-[1152px] items-center justify-between px-[clamp(20px,5vw,64px)]">
        {/* Brand Wordmark: 18-20px at weight 600 */}
        <div className="flex items-center">
          <a
            href="#"
            className="flex min-h-[40px] items-center font-mono text-[19px] font-semibold tracking-[0.08em] text-ink uppercase transition-colors hover:text-amber focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 rounded-sm"
          >
            ODYSSEIA
          </a>
        </div>

        {/* Anchors: 14-15px, mono uppercase with 0.08em tracking, in full ink color at 85-90% opacity, 100% on hover/active */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 font-mono text-[14px] uppercase tracking-[0.08em]">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex min-h-[40px] items-center px-1 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 rounded-sm ${
                  isActive
                    ? 'text-ink font-semibold opacity-100 border-b-2 border-amber'
                    : 'text-ink/85 hover:text-ink hover:opacity-100'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </div>

        {/* Action Button: 14px with comfortable padding, min 40px touch target */}
        <div className="flex items-center">
          <button
            onClick={onEnterApp}
            className="flex min-h-[40px] items-center justify-center rounded-none bg-amber px-5 py-2 font-mono text-[14px] font-medium uppercase tracking-[0.08em] text-ground shadow-sm transition-all hover:bg-amber-gold active:bg-amber-pressed focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 cursor-pointer"
          >
            Enter Mission Control
          </button>
        </div>
      </div>
    </nav>
  );
}
