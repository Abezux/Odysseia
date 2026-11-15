import { describe, it, expect, beforeEach } from 'vitest';
import { useNotificationStore } from '../../src/store/useNotificationStore';
import { showToast } from '../../src/ui/toastStore';
import { computeMissionAlerts } from '../../src/lib/alerts';
import type { MetricsResult, Site } from '../../src/contracts';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true
});

describe('Group 1: Notification Center & Shared Alert Store', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    useNotificationStore.setState({
      notifications: [],
      readIds: new Set(),
      filter: 'all'
    });
  });

  it('initializes with empty notifications and zero unread count', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(0);
    const unread = state.notifications.filter((n) => !n.read).length;
    expect(unread).toBe(0);
  });

  it('adds notifications and computes unread count correctly', () => {
    useNotificationStore.getState().addNotification({
      type: 'alert',
      severity: 'critical',
      title: 'Sunset in 4.2h',
      detail: 'Critical power drop imminent.',
      simTime: '12:00:00 UTC',
      simTimestampMs: 1794657600000,
      siteId: 'shackleton-rim'
    });

    const notifs = useNotificationStore.getState().notifications;
    expect(notifs).toHaveLength(1);
    expect(notifs[0].title).toBe('Sunset in 4.2h');
    expect(notifs[0].read).toBe(false);
    expect(notifs[0].severity).toBe('critical');
    expect(notifs[0].siteId).toBe('shackleton-rim');
  });

  it('deduplicates continuous simulation ticks for the same event and caps at 50', () => {
    const baseTimeMs = 1794657600000;

    // Simulate 5 ticks within the same 10-minute window for the same event
    for (let i = 0; i < 5; i++) {
      useNotificationStore.getState().addNotification({
        type: 'alert',
        severity: 'warning',
        title: `Sunset in ${(12.0 - i * 0.05).toFixed(1)}h`,
        detail: 'Solar elevation dropping.',
        simTime: `12:0${i}:00 UTC`,
        simTimestampMs: baseTimeMs,
        siteId: 'shackleton-rim'
      });
    }

    const notifs = useNotificationStore.getState().notifications;
    expect(notifs).toHaveLength(1);
    // Updated with latest detail/time without creating duplicate
    expect(notifs[0].title).toBe('Sunset in 11.8h');

    // Add 60 distinct events to verify 50-cap
    for (let i = 0; i < 60; i++) {
      useNotificationStore.getState().addNotification({
        type: 'system',
        severity: 'info',
        title: `Event ${i}`,
        detail: `Detail ${i}`,
        simTime: '12:00:00 UTC',
        simTimestampMs: baseTimeMs + (i + 1) * 3600 * 1000,
        siteId: `site-${i}`
      });
    }

    expect(useNotificationStore.getState().notifications.length).toBe(50);
  });

  it('marks all notifications read and updates localStorage persistence', () => {
    useNotificationStore.getState().addNotification({
      id: 'test-1',
      type: 'alert',
      severity: 'warning',
      title: 'Alert 1',
      detail: 'Detail',
      simTime: '12:00:00 UTC'
    });
    useNotificationStore.getState().addNotification({
      id: 'test-2',
      type: 'system',
      severity: 'info',
      title: 'System 1',
      detail: 'Detail',
      simTime: '12:00:00 UTC'
    });

    expect(useNotificationStore.getState().notifications.filter((n) => !n.read)).toHaveLength(2);

    useNotificationStore.getState().markAllRead();

    expect(useNotificationStore.getState().notifications.filter((n) => !n.read)).toHaveLength(0);
    const stored = JSON.parse(localStorage.getItem('odysseia_read_notifications') || '[]');
    expect(stored).toContain('test-1');
    expect(stored).toContain('test-2');
  });

  it('marks individual notification as read', () => {
    useNotificationStore.getState().addNotification({
      id: 'target-item',
      type: 'alert',
      severity: 'critical',
      title: 'Critical Alert',
      detail: 'Detail',
      simTime: '12:00:00 UTC'
    });

    useNotificationStore.getState().setRead('target-item', true);
    const target = useNotificationStore.getState().notifications.find((n) => n.id === 'target-item');
    expect(target?.read).toBe(true);
  });

  it('clears all notifications', () => {
    useNotificationStore.getState().addNotification({
      type: 'alert',
      severity: 'info',
      title: 'Notice',
      detail: 'Detail',
      simTime: '12:00:00 UTC'
    });

    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    useNotificationStore.getState().clearAll();
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('filters by category: all | alert | system', () => {
    useNotificationStore.getState().addNotification({
      type: 'alert',
      severity: 'critical',
      title: 'Alert A',
      detail: 'Detail',
      simTime: '12:00:00 UTC'
    });
    useNotificationStore.getState().addNotification({
      type: 'system',
      severity: 'info',
      title: 'System B',
      detail: 'Detail',
      simTime: '12:00:00 UTC'
    });
    useNotificationStore.getState().addNotification({
      type: 'user',
      severity: 'info',
      title: 'User C',
      detail: 'Detail',
      simTime: '12:00:00 UTC'
    });

    const notifs = useNotificationStore.getState().notifications;
    expect(notifs).toHaveLength(3);

    const alertsOnly = notifs.filter((n) => n.type === 'alert');
    expect(alertsOnly).toHaveLength(1);
    expect(alertsOnly[0].title).toBe('Alert A');

    const systemAndUser = notifs.filter((n) => n.type === 'system' || n.type === 'user');
    expect(systemAndUser).toHaveLength(2);
  });

  it('syncs toast messages automatically into the Notification Store', () => {
    showToast({
      title: 'Added to Compare Matrix',
      subtitle: 'Shackleton Connecting Ridge · 2/4',
      severity: 'success'
    });

    const notifs = useNotificationStore.getState().notifications;
    expect(notifs.length).toBeGreaterThan(0);
    const toastNotif = notifs.find((n) => n.title === 'Added to Compare Matrix');
    expect(toastNotif).toBeDefined();
    expect(toastNotif?.type).toBe('user');
    expect(toastNotif?.severity).toBe('success');
    expect(toastNotif?.detail).toContain('Shackleton Connecting Ridge');
  });

  it('syncs mission alerts and attaches event timestamp for timeline jumps', () => {
    const mockSite: Site = {
      id: 'shackleton-rim',
      name: 'Shackleton Rim',
      latDeg: -89.9,
      lonDeg: 0,
      elevationM: 1000,
      description: 'Test',
      category: 'artemis_candidate',
      status: 'candidate_region',
      agencyOrOperator: 'NASA',
      referenceUrl: 'https://nasa.gov',
      isSouthPoleRegion: true,
      tags: ['test']
    };

    const mockMetrics: Partial<MetricsResult> = {
      siteId: 'shackleton-rim',
      evaluationTimeIso: '2026-11-14T12:00:00.000Z',
      timeToNextSunsetHours: 8.5,
      timeToNextSunriseHours: null,
      timeToNextEarthsetHours: 4.2,
      timeToNextEarthriseHours: null,
      timelineWindows: [
        {
          startIso: '2026-11-15T12:00:00.000Z',
          endIso: '2026-11-17T12:00:00.000Z',
          durationHours: 48,
          type: 'dark'
        },
        {
          startIso: '2026-11-17T12:00:00.000Z',
          endIso: '2026-11-22T12:00:00.000Z',
          durationHours: 120,
          type: 'sunlit'
        }
      ]
    };

    const currentTime = new Date('2026-11-14T12:00:00.000Z');
    const alerts = computeMissionAlerts(mockMetrics as MetricsResult, mockSite, currentTime);

    expect(alerts.length).toBeGreaterThan(0);
    const sunsetAlert = alerts.find((a) => a.id.startsWith('alert-sunset'));
    expect(sunsetAlert).toBeDefined();
    expect(sunsetAlert?.simTimestampMs).toBe(currentTime.getTime() + 8.5 * 3600 * 1000);

    useNotificationStore.getState().syncAlerts(alerts, currentTime, mockSite.id);

    const notifs = useNotificationStore.getState().notifications;
    const sunsetNotif = notifs.find((n) => n.title.includes('Sunset'));
    expect(sunsetNotif).toBeDefined();
    expect(sunsetNotif?.simTimestampMs).toBe(sunsetAlert?.simTimestampMs);
  });
});
