import React from 'react';
import { BandHeader } from './BandHeader';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Why is solar illumination at the lunar South Pole so unpredictable?',
    answer:
      "Because the Moon's spin axis is tilted only 1.54° relative to the ecliptic, the Sun skims the horizon at 0° to 3° elevation. Topographic ridges kilometers away cast dynamic, 50-kilometer shadows that sweep across terrain in hours, transforming bathed peaks into freezing voids."
  },
  {
    question: 'How does Odysseia determine whether the Sun or Earth is visible?',
    answer:
      'Odysseia computes high-precision topocentric coordinates using the SPICE/Horizons-validated VSOP87 ephemeris algorithm, then performs continuous horizon masking against high-resolution LOLA (Lunar Orbiter Laser Altimeter) 20m/pixel terrain elevation profiles to detect real occlusion.'
  },
  {
    question: 'What happens to the landing site during an unpredicted launch slip?',
    answer:
      "Even a 48-hour launch delay can shift the landing date past a critical illumination cliff. Odysseia's Scenario Matrix and Year-Round Sweep immediately compute contingency landing dates, showing remaining battery margins and Earth line-of-sight blackout durations."
  },
  {
    question: 'How accurate are Odysseia’s ephemeris predictions compared to NASA JPL Horizons?',
    answer:
      'Odysseia’s offline astronomical engine maintains an angular RMSE of under 0.022° against NASA JPL Horizons vectors for 2025–2030, executing inside a high-throughput Web Worker that generates 700+ hour trajectories in under 5 milliseconds.'
  },
  {
    question: 'Can custom landing sites or rover traverses be evaluated?',
    answer:
      'Yes. In addition to the candidate Artemis landing sites (Shackleton Rim, Malapert Plateau, Connecting Ridge, De Gerlache Rim), planners can input arbitrary latitude, longitude, and mast heights, or supply custom azimuth-elevation horizon profiles.'
  }
];

export function BandFAQ(): React.JSX.Element {
  return (
    <section id="faq" className="relative z-10 w-full bg-transparent py-24 select-none">
      <div className="mx-auto w-full max-w-[1152px] px-[clamp(20px,5vw,64px)]">
        <BandHeader
          eyebrow="05 · INQUIRY"
          headline="Questions from the flight path."
          lede="Detailed mechanics behind the raycasting engine, ephemeris accuracy, and lunar landing constraints."
        />

        {/* Native details/summary rows on hairline borders */}
        <div className="w-full border-t border-hairline pt-0">
          {faqs.map((faq, idx) => (
            <details
              key={idx}
              className="group border-b border-hairline py-[22px] transition-colors focus:outline-none"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 focus:outline-none [&::-webkit-details-marker]:hidden">
                <span className="font-sans font-light text-[17px] text-ink transition-colors group-hover:text-amber">
                  {faq.question}
                </span>

                {/* 13px plus glyph from two absolutely-positioned 1px bars */}
                <div
                  className="relative h-[13px] w-[13px] shrink-0 flex items-center justify-center"
                  aria-hidden="true"
                >
                  {/* Horizontal bar */}
                  <span className="absolute h-[1px] w-[13px] bg-muted transition-colors group-hover:bg-amber" />
                  {/* Vertical bar: scales to 0 when open */}
                  <span className="plus-v absolute h-[13px] w-[1px] bg-muted transition-all duration-300 origin-center group-open:scale-y-0 group-hover:bg-amber" />
                </div>
              </summary>

              <div className="pt-4 pr-10">
                <p className="font-sans font-light text-[15px] leading-[1.7] text-muted">
                  {faq.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
