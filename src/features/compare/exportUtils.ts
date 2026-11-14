import type { Scenario, MetricsResult, Site } from '../../contracts';

export function formatComparisonCsv(
  scenarios: Scenario[],
  results: Record<string, MetricsResult>,
  sites: Record<string, Site>
): string {
  const headers = [
    'Scenario Label',
    'Site ID',
    'Site Name',
    'Latitude (deg)',
    'Longitude (deg)',
    'Elevation (m)',
    'Landing Time (UTC)',
    'Overall Score (0-100)',
    'Power Score',
    'Comms Score',
    'Thermal Score',
    'Illumination Fraction (%)',
    'DTE Availability (%)',
    'Max Sunlit Stretch (hrs)',
    'Max Dark Stretch (hrs)',
    'Max Comms Blackout (hrs)',
    'Solar Proxy (Vert %)',
    'Sun Elevation at Epoch (deg)',
    'Earth Elevation at Epoch (deg)'
  ];

  const rows = scenarios.map((sc) => {
    const res = results[sc.id];
    const site = sites[sc.siteId];

    if (!res || !site) {
      return [
        `"${sc.label}"`,
        sc.siteId,
        `"${site?.name ?? 'Unknown'}"`,
        sc.customCoordinates?.latDeg ?? site?.latDeg ?? 0,
        sc.customCoordinates?.lonDeg ?? site?.lonDeg ?? 0,
        site?.elevationM ?? 0,
        sc.landingTimeIso,
        'N/A'
      ].join(',');
    }

    return [
      `"${sc.label}"`,
      sc.siteId,
      `"${site.name}"`,
      (sc.customCoordinates?.latDeg ?? site.latDeg).toFixed(4),
      (sc.customCoordinates?.lonDeg ?? site.lonDeg).toFixed(4),
      site.elevationM ?? 0,
      sc.landingTimeIso,
      res.scorecard.overallScore,
      res.scorecard.powerScore,
      res.scorecard.communicationScore,
      res.scorecard.thermalSurvivabilityScore,
      (res.illuminationFraction * 100).toFixed(1),
      (res.dteAvailabilityFraction * 100).toFixed(1),
      res.longestSunlitStretchHours.toFixed(1),
      res.longestDarkStretchHours.toFixed(1),
      res.longestDteBlackoutHours.toFixed(1),
      (res.solarPowerProxyVertical * 100).toFixed(1),
      res.currentEphemeris.sun.elevationDeg.toFixed(2),
      res.currentEphemeris.earth.elevationDeg.toFixed(2)
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function downloadComparisonCsv(
  scenarios: Scenario[],
  results: Record<string, MetricsResult>,
  sites: Record<string, Site>
): void {
  const csv = formatComparisonCsv(scenarios, results, sites);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `LunarSite_Compare_Matrix_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyComparisonMarkdown(
  scenarios: Scenario[],
  results: Record<string, MetricsResult>,
  sites: Record<string, Site>
): Promise<boolean> {
  const lines = [
    '# LunarSite Compare — Scenario Evaluation Matrix',
    '',
    `| Scenario | Site | Lat/Lon | Score | Illumination | DTE Avail | Max Sunlit | Max Blackout |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`
  ];

  for (const sc of scenarios) {
    const res = results[sc.id];
    const site = sites[sc.siteId];
    if (res && site) {
      const lat = (sc.customCoordinates?.latDeg ?? site.latDeg).toFixed(2);
      const lon = (sc.customCoordinates?.lonDeg ?? site.lonDeg).toFixed(2);
      lines.push(
        `| **${sc.label}** | ${site.name} | ${lat}°, ${lon}° | **${res.scorecard.overallScore}/100** | ${(res.illuminationFraction * 100).toFixed(1)}% | ${(res.dteAvailabilityFraction * 100).toFixed(1)}% | ${res.longestSunlitStretchHours.toFixed(1)}h | ${res.longestDteBlackoutHours.toFixed(1)}h |`
      );
    }
  }

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    return true;
  } catch {
    return false;
  }
}
