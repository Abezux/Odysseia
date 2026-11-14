import React from 'react';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  variant?: 'solid' | 'glass';
}

export function Panel({
  title,
  subtitle,
  action,
  variant = 'solid',
  className = '',
  children,
  ...props
}: PanelProps): React.JSX.Element {
  const bgClasses =
    variant === 'glass'
      ? 'glass-panel rounded-2xl'
      : 'bg-panel border border-panel-border rounded-2xl shadow-xl';

  return (
    <div className={`flex flex-col ${bgClasses} ${className}`} {...props}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-panel-border/80 px-4 py-3">
          <div>
            {typeof title === 'string' ? (
              <h2 className="text-xs font-sans font-semibold uppercase tracking-wider text-ink">
                {title}
              </h2>
            ) : (
              title
            )}
            {subtitle && (
              <p className="mt-0.5 font-mono text-[11px] text-muted">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}
