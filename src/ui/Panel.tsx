import React from 'react';

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  borderAccent?: 'default' | 'sun' | 'earth' | 'comms';
}

export function Panel({
  title,
  subtitle,
  action,
  borderAccent = 'default',
  className = '',
  children,
  ...props
}: PanelProps): React.JSX.Element {
  const accentClasses = {
    default: 'border-space-700/60',
    sun: 'border-sun-amber/30',
    earth: 'border-earth-blue/30',
    comms: 'border-comms-green/30'
  }[borderAccent];

  return (
    <div
      className={`flex flex-col rounded-lg border bg-space-900/80 backdrop-blur-md shadow-xl ${accentClasses} ${className}`}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-space-800/80 px-4 py-2.5">
          <div>
            {typeof title === 'string' ? (
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                {title}
              </h2>
            ) : (
              title
            )}
            {subtitle && (
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}
