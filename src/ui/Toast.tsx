import React from 'react';
import { useToastStore } from './toastStore';

export function ToastContainer(): React.JSX.Element {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return <></>;

  return (
    <aside
      aria-label="Mission notifications"
      className="fixed top-6 right-6 z-[100] flex flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((t) => {
        const severityBorder =
          t.severity === 'critical'
            ? 'border-l-critical'
            : t.severity === 'warning'
            ? 'border-l-warning'
            : t.severity === 'success'
            ? 'border-l-emerald'
            : 'border-l-amber';

        const severityBadge =
          t.severity === 'critical'
            ? 'bg-critical/15 text-critical border-critical/30'
            : t.severity === 'warning'
            ? 'bg-warning/15 text-warning border-warning/30'
            : t.severity === 'success'
            ? 'bg-emerald/15 text-emerald border-emerald/30'
            : 'bg-amber/15 text-amber border-amber/30';

        return (
          <div
            key={t.id}
            role="status"
            className={`toast-slide-in pointer-events-auto w-80 rounded-2xl glass-panel p-3.5 shadow-2xl border-l-4 ${severityBorder} transition-all`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    t.severity === 'critical'
                      ? 'bg-critical'
                      : t.severity === 'warning'
                      ? 'bg-warning'
                      : t.severity === 'success'
                      ? 'bg-emerald'
                      : 'bg-amber'
                  }`}
                />
                <h4 className="font-sans text-xs font-bold text-ink leading-tight">
                  {t.title}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-muted hover:text-ink text-xs p-0.5 transition-colors"
                title="Dismiss toast"
              >
                ✕
              </button>
            </div>

            {t.subtitle && (
              <p className="mt-1.5 font-sans text-[11px] text-muted leading-relaxed pl-4">
                {t.subtitle}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between pl-4 font-mono text-[9px] text-muted">
              <span>{t.timestamp}</span>
              <span className={`rounded-full px-1.5 py-0.2 border uppercase ${severityBadge}`}>
                {t.severity || 'info'}
              </span>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
