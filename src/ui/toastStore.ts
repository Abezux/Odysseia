import { create } from 'zustand';
import { useNotificationStore } from '../store/useNotificationStore';
import { useTimeStore } from '../store/useTimeStore';
import { useScenarioStore } from '../store/useScenarioStore';

export interface ToastMessage {
  id: string;
  title: string;
  subtitle?: string;
  severity?: 'success' | 'warning' | 'critical' | 'info';
  timestamp?: string;
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastMessage = {
      ...toast,
      id,
      timestamp: toast.timestamp || new Date().toISOString().slice(11, 19) + ' UTC'
    };
    set((state) => ({ toasts: [...state.toasts.slice(-4), newToast] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
}));

export function showToast(toast: Omit<ToastMessage, 'id'>): void {
  useToastStore.getState().addToast(toast);

  // Sync toast events into the unified Notification Store
  try {
    const titleLower = toast.title.toLowerCase();
    const isUserAction =
      titleLower.includes('compare') ||
      titleLower.includes('epoch') ||
      titleLower.includes('created') ||
      titleLower.includes('matrix');

    const simTime = useTimeStore.getState().currentTime;
    const activeSiteId = useScenarioStore.getState().activeSiteId;

    useNotificationStore.getState().addNotification({
      type: isUserAction ? 'user' : 'system',
      severity: toast.severity || 'info',
      title: toast.title,
      detail: toast.subtitle || '',
      simTime: simTime.toISOString().slice(11, 19) + ' UTC',
      simTimestampMs: simTime.getTime(),
      siteId: activeSiteId
    });
  } catch {
    // Avoid crashing if stores are not yet initialized during SSR/tests
  }
}
