import { create } from 'zustand';

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
}
