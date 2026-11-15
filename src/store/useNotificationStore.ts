import { create } from 'zustand';
import type { AlertItem } from '../lib/alerts';

export type NotificationType = 'alert' | 'system' | 'user';
export type NotificationSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface AppNotification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  detail: string;
  simTime: string;
  simTimestampMs?: number;
  createdAt: number;
  read: boolean;
  siteId?: string;
  dedupKey: string;
}

const STORAGE_KEY = 'odysseia_read_notifications';

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed);
      }
    }
  } catch {
    // Ignore localStorage access restrictions
  }
  return new Set();
}

function persistReadIds(ids: Set<string>): void {
  try {
    const arr = Array.from(ids).slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // Ignore localStorage quota or access errors
  }
}

interface NotificationState {
  notifications: AppNotification[];
  readIds: Set<string>;
  filter: 'all' | 'alert' | 'system';
  setFilter: (filter: 'all' | 'alert' | 'system') => void;
  addNotification: (
    notif: Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'dedupKey'> & { id?: string }
  ) => void;
  syncAlerts: (alerts: AlertItem[], simTime: Date, siteId?: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  setRead: (id: string, read?: boolean) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  readIds: loadReadIds(),
  filter: 'all',

  setFilter: (filter) => set({ filter }),

  addNotification: (notif) => {
    const { notifications, readIds } = get();
    // Quantize event time to 10-minute bins to prevent duplicate notifications during continuous simulation
    const eventTimeKey = notif.simTimestampMs
      ? Math.round(notif.simTimestampMs / (10 * 60 * 1000)) * (10 * 60 * 1000)
      : Math.round(Date.now() / 10000) * 10000;

    // Normalize title numbers (e.g. "Sunset in 12.3h" vs "Sunset in 12.0h") for mission event deduplication
    const normalizedTitle = notif.title.replace(/\d+\.?\d*h/g, 'Xh');
    const dedupKey = `${notif.type}::${notif.siteId ?? 'global'}::${normalizedTitle}::${eventTimeKey}`;

    const existingIndex = notifications.findIndex((n) => n.dedupKey === dedupKey);

    if (existingIndex >= 0) {
      // Update existing notification with newest detail and time, keeping read state intact
      const updated = [...notifications];
      updated[existingIndex] = {
        ...updated[existingIndex],
        title: notif.title,
        detail: notif.detail,
        simTime: notif.simTime,
        simTimestampMs: notif.simTimestampMs ?? updated[existingIndex].simTimestampMs
      };
      set({ notifications: updated });
      return;
    }

    const id = notif.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const isRead = readIds.has(id);

    const newNotification: AppNotification = {
      ...notif,
      id,
      dedupKey,
      createdAt: Date.now(),
      read: isRead
    };

    set({
      notifications: [newNotification, ...notifications].slice(0, 50)
    });
  },

  syncAlerts: (alerts, simTime, siteId) => {
    const timeStr = simTime.toISOString().slice(11, 19) + ' UTC';
    const store = get();

    alerts.forEach((alert) => {
      const type: NotificationType =
        alert.type ?? (alert.severity === 'critical' || alert.severity === 'warning' ? 'alert' : 'system');
      const simTimestampMs = alert.simTimestampMs ?? simTime.getTime();

      store.addNotification({
        id: alert.id,
        type,
        severity: alert.severity,
        title: alert.title,
        detail: alert.description,
        simTime: alert.timestamp || timeStr,
        simTimestampMs,
        siteId: alert.siteId ?? siteId
      });
    });
  },

  markAllRead: () => {
    set((state) => {
      const nextReadIds = new Set(state.readIds);
      state.notifications.forEach((n) => nextReadIds.add(n.id));
      persistReadIds(nextReadIds);
      return {
        readIds: nextReadIds,
        notifications: state.notifications.map((n) => ({ ...n, read: true }))
      };
    });
  },

  clearAll: () => {
    set({ notifications: [] });
  },

  setRead: (id, read = true) => {
    set((state) => {
      const nextReadIds = new Set(state.readIds);
      if (read) {
        nextReadIds.add(id);
      } else {
        nextReadIds.delete(id);
      }
      persistReadIds(nextReadIds);
      return {
        readIds: nextReadIds,
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read } : n
        )
      };
    });
  }
}));
