import type { Scorecard, ScoreFactor } from '../../contracts';
import type { SynodicWindowAnalysis } from './eventSearch';

/**
 * Evaluates the Mission Viability Scorecard based on transparent engineering rules.
 * Rules Version: 1.0.0
 */
export function computeMissionScorecard(analysis: SynodicWindowAnalysis): Scorecard {
  const factors: ScoreFactor[] = [];

  // 1. Power Score Factors
  // a) Illumination Fraction (60% weight of power)
  const illumPct = analysis.illuminationFraction * 100;
  const illumScore = Math.max(0, Math.min(100, illumPct));
  factors.push({
    name: 'Illumination Fraction',
    score: Math.round(illumScore),
    weight: 0.24,
    metricValue: `${illumPct.toFixed(1)}%`,
    explanation:
      illumPct >= 70
        ? 'High polar plateau illumination; favorable for sustained solar operations.'
        : illumPct >= 40
        ? 'Standard synodic daylight window; requires moderate battery buffer.'
        : 'Low illumination window; high risk of extended solar starvation.'
  });

  // b) Darkness Streak (40% weight of power)
  // Continuous darkness > 100 hours severely stresses surface batteries
  const darkHours = analysis.longestDarkStretchHours;
  let darkScore = 100;
  if (darkHours > 0) {
    darkScore = Math.max(0, Math.min(100, 100 - (darkHours / 354.0) * 100));
  }
  factors.push({
    name: 'Night Survivability Window',
    score: Math.round(darkScore),
    weight: 0.16,
    metricValue: `${darkHours.toFixed(1)} hrs`,
    explanation:
      darkHours <= 50
        ? 'Brief darkness interval; lightweight battery system sufficient.'
        : darkHours <= 200
        ? 'Moderate night duration; requires standard primary mission battery pack.'
        : 'Protracted lunar night (>200 hrs); requires radioisotope or cryogenic sleep system.'
  });

  const powerScore = Math.round(illumScore * 0.6 + darkScore * 0.4);

  // 2. Communication Score Factors
  // a) DTE Availability Fraction (70% weight of comms)
  const dtePct = analysis.dteAvailabilityFraction * 100;
  const dteScore = Math.max(0, Math.min(100, dtePct));
  factors.push({
    name: 'Direct-to-Earth (DTE) Contact',
    score: Math.round(dteScore),
    weight: 0.25,
    metricValue: `${dtePct.toFixed(1)}%`,
    explanation:
      dtePct >= 80
        ? 'Exceptional Earth visibility; near-continuous real-time telemetry.'
        : dtePct >= 50
        ? 'Regular daily DTE communication passes without relay satellite.'
        : 'Severely obstructed line of sight to Earth; relay satellite required.'
  });

  // b) Maximum Communication Blackout (30% weight of comms)
  const blackoutHours = analysis.longestDteBlackoutHours;
  let blackoutScore = 100;
  if (blackoutHours > 0) {
    blackoutScore = Math.max(0, Math.min(100, 100 - (blackoutHours / 354.0) * 100));
  }
  factors.push({
    name: 'Maximum DTE Outage',
    score: Math.round(blackoutScore),
    weight: 0.1,
    metricValue: `${blackoutHours.toFixed(1)} hrs`,
    explanation:
      blackoutHours === 0
        ? 'Continuous direct link, zero communication blackouts.'
        : blackoutHours <= 48
        ? 'Short communication hiatus manageable with onboard data recorders.'
        : 'Extended loss of signal (>48 hrs); autonomous fault protection required.'
  });

  const communicationScore = Math.round(dteScore * 0.7 + blackoutScore * 0.3);

  // 3. Thermal Survivability Score
  // Driven primarily by darkness duration and thermal shock cycles
  const thermalScore = Math.round(darkScore * 0.8 + dteScore * 0.2);
  factors.push({
    name: 'Thermal Environment Stability',
    score: thermalScore,
    weight: 0.25,
    metricValue: `${thermalScore}/100`,
    explanation:
      thermalScore >= 75
        ? 'Stable thermal conditions with minimal deep-freeze duration.'
        : thermalScore >= 50
        ? 'Nominal lunar thermal diurnal cycling.'
        : 'Severe cryogenic conditions; heater budget must be prioritized.'
  });

  // 4. Overall Weighted Score
  const overallScore = Math.round(
    powerScore * 0.4 + communicationScore * 0.35 + thermalScore * 0.25
  );

  return {
    overallScore,
    powerScore,
    communicationScore,
    thermalSurvivabilityScore: thermalScore,
    factors,
    rulesVersion: '1.0.0'
  };
}
