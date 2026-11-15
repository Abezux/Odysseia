import React from 'react';
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useToastStore } from './toastStore';
import { Icon } from './Icon';

export function ToastContainer(): React.JSX.Element {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return <></>;

  return (
    <aside
      aria-label="Mission notifications"
      className="fixed top-6 right-6 z-toast flex flex-col gap-2.5 pointer-events-none"
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

        const SeverityIcon =
          t.severity === 'critical'
            ? XCircle
            : t.severity === 'warning'
            ? AlertTriangle
            : t.severity === 'success'
            ? CheckCircle2
            : Info;

        const iconColor =
          t.severity === 'critical'
            ? 'text-critical'
            : t.severity === 'warning'
            ? 'text-warning'
            : t.severity === 'success'
            ? 'text-emerald'
            : 'text-amber';

        return (
          <div
            key={t.id}
            role="status"
            className={`toast-slide-in pointer-events-auto w-80 rounded-2xl glass-panel p-3.5 shadow-2xl border-l-4 ${severityBorder} transition-all`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon icon={SeverityIcon} size={16} className={iconColor} />
                <h4 className="font-sans text-xs font-bold text-ink leading-tight">
                  {t.title}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-muted hover:text-ink p-1 rounded-md transition-colors"
                title="Dismiss toast"
                aria-label="Dismiss toast"
              >
                <Icon icon={X} size={16} />
              </button>
            </div>

            {t.subtitle && (
              <p className="mt-1.5 font-sans text-[11px] text-muted leading-relaxed pl-6">
                {t.subtitle}
              </p>
            )}

            <div className="mt-2 flex items-center justify-between pl-6 font-mono text-[9px] text-muted">
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
