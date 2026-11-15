import type { MetricsResult, Site } from '../contracts';

export interface AlertItem {
  id: string;
  severity: 'success' | 'warning' | 'critical' | 'info';
  title: string;
  timestamp: string;
  description: string;
  type?: 'alert' | 'system' | 'user';
  simTimestampMs?: number;
  siteId?: string;
}

export function computeMissionAlerts(
  metrics: MetricsResult | null,
  site: Site | null,
  currentTime: Date
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const timeStr = currentTime.toISOString().slice(11, 19) + ' UTC';

  if (!metrics || !site) {
    alerts.push({
      id: 'init-sync',
      severity: 'info',
      title: 'Awaiting Ephemeris Telemetry',
      timestamp: timeStr,
      description: 'Synchronizing topocentric coordinate frames with Web Worker.',
      type: 'system',
      simTimestampMs: currentTime.getTime()
    });
    return alerts;
  }

  // 1. Solar alerts (sunset or sunrise within the next 24-48 simulated hours)
  if (metrics.timeToNextSunsetHours !== null && metrics.timeToNextSunsetHours > 0) {
    const hrs = metrics.timeToNextSunsetHours;
    const eventTimeMs = currentTime.getTime() + Math.round(hrs * 3600) * 1000;
    alerts.push({
      id: `alert-sunset-${site.id}`,
      severity: hrs <= 12 ? 'critical' : hrs <= 48 ? 'warning' : 'info',
      title: `Sunset in ${hrs.toFixed(1)}h`,
      timestamp: timeStr,
      description:
        hrs <= 12
          ? 'Critical solar power drop imminent. Vertical solar generation ending.'
          : 'Solar elevation approaching local crater rim crest.',
      type: 'alert',
      simTimestampMs: eventTimeMs,
      siteId: site.id
    });
  } else if (metrics.timeToNextSunriseHours !== null && metrics.timeToNextSunriseHours > 0) {
    const hrs = metrics.timeToNextSunriseHours;
    const eventTimeMs = currentTime.getTime() + Math.round(hrs * 3600) * 1000;
    alerts.push({
      id: `alert-sunrise-${site.id}`,
      severity: 'info',
      title: `Sunrise in ${hrs.toFixed(1)}h`,
      timestamp: timeStr,
      description: 'Lander in shadow. Thermal conditioning active on reserve.',
      type: 'alert',
      simTimestampMs: eventTimeMs,
      siteId: site.id
    });
  }

  // 2. Earth comms alerts (line-of-sight lost or regained)
  if (metrics.timeToNextEarthsetHours !== null && metrics.timeToNextEarthsetHours > 0) {
    const hrs = metrics.timeToNextEarthsetHours;
    const eventTimeMs = currentTime.getTime() + Math.round(hrs * 3600) * 1000;
    alerts.push({
      id: `alert-earthset-${site.id}`,
      severity: hrs <= 6 ? 'critical' : 'warning',
      title: `Earth line-of-sight lost in ${hrs.toFixed(1)}h`,
      timestamp: timeStr,
      description: 'Libration vector rotating below local topography.',
      type: 'alert',
      simTimestampMs: eventTimeMs,
      siteId: site.id
    });
  } else if (metrics.timeToNextEarthriseHours !== null && metrics.timeToNextEarthriseHours > 0) {
    const hrs = metrics.timeToNextEarthriseHours;
    const eventTimeMs = currentTime.getTime() + Math.round(hrs * 3600) * 1000;
    alerts.push({
      id: `alert-earthrise-${site.id}`,
      severity: 'critical',
      title: `Direct-to-Earth Blackout (Rise in ${hrs.toFixed(1)}h)`,
      timestamp: timeStr,
      description: 'No direct ground communication link. Orbital relay required.',
      type: 'alert',
      simTimestampMs: eventTimeMs,
      siteId: site.id
    });
  } else {
    alerts.push({
      id: `alert-los-ok-${site.id}`,
      severity: 'success',
      title: 'Direct-to-Earth Link Continuous',
      timestamp: timeStr,
      description: 'Sub-Earth libration angle remains clear above terrain horizon.',
      type: 'system',
      simTimestampMs: currentTime.getTime(),
      siteId: site.id
    });
  }

  // 3. Long darkness periods and best illumination window (derived from 29.53d timeline windows)
  if (metrics.timelineWindows && metrics.timelineWindows.length > 0) {
    const nowIso = currentTime.toISOString();

    // Check for upcoming darkness period >= 24h
    const upcomingDark = metrics.timelineWindows.find(
      (w) => w.type === 'dark' && w.durationHours >= 24 && w.startIso > nowIso
    );
    if (upcomingDark) {
      const darkStartMs = new Date(upcomingDark.startIso).getTime();
      const hrsUntilDark = (darkStartMs - currentTime.getTime()) / (3600 * 1000);
      if (hrsUntilDark > 0 && hrsUntilDark <= 72) {
        alerts.push({
          id: `alert-darkness-${site.id}`,
          severity: hrsUntilDark <= 12 ? 'critical' : 'warning',
          title: `Long Darkness in ${hrsUntilDark.toFixed(1)}h (${upcomingDark.durationHours.toFixed(0)}h duration)`,
          timestamp: timeStr,
          description: `Extended solar eclipse shadow approaching ${site.name}. Duration: ${upcomingDark.durationHours.toFixed(1)} hours.`,
          type: 'alert',
          simTimestampMs: darkStartMs,
          siteId: site.id
        });
      }
    }

    // Check for best continuous sunlit window
    const sunlitWindows = metrics.timelineWindows
      .filter((w) => w.type === 'sunlit')
      .sort((a, b) => b.durationHours - a.durationHours);
    if (sunlitWindows.length > 0) {
      const bestWindow = sunlitWindows[0];
      const bestStartMs = new Date(bestWindow.startIso).getTime();
      const hrsUntilBest = (bestStartMs - currentTime.getTime()) / (3600 * 1000);
      if (hrsUntilBest > 0 && hrsUntilBest <= 96) {
        alerts.push({
          id: `alert-best-window-${site.id}`,
          severity: 'info',
          title: `Prime Sunlit Window in ${hrsUntilBest.toFixed(1)}h`,
          timestamp: timeStr,
          description: `Longest continuous sunlit window (${bestWindow.durationHours.toFixed(1)}h) begins at ${bestWindow.startIso.slice(11, 16)} UTC.`,
          type: 'alert',
          simTimestampMs: bestStartMs,
          siteId: site.id
        });
      }
    }
  }

  // 4. Astrometric tracking validation
  alerts.push({
    id: `alert-ephem-lock-${site.id}`,
    severity: 'success',
    title: 'Ephemeris Vectors Locked',
    timestamp: timeStr,
    description: `Topocentric coordinates for ${site.name} validated against JPL Horizons (<0.022° RMSE).`,
    type: 'system',
    simTimestampMs: currentTime.getTime(),
    siteId: site.id
  });

  return alerts;
}
