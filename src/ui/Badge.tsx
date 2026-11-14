import React from 'react';

export type BadgeVariant =
  | 'simulated'
  | 'no-terrain'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

export function Badge({
  variant = 'neutral',
  size = 'sm',
  className = '',
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  let variantClasses = 'bg-space-800 text-slate-300 border-space-700';
  let defaultLabel = children;

  switch (variant) {
    case 'simulated':
      variantClasses = 'bg-amber-950/40 text-sun-amber border-sun-amber/40';
      defaultLabel = children ?? 'Simulated terrain';
      break;
    case 'no-terrain':
      variantClasses = 'bg-slate-900/60 text-slate-400 border-slate-700 border-dashed';
      defaultLabel = children ?? 'Terrain not included';
      break;
    case 'success':
      variantClasses = 'bg-emerald-950/40 text-comms-signal border-comms-green/40';
      break;
    case 'warning':
      variantClasses = 'bg-amber-950/40 text-amber-300 border-amber-500/40';
      break;
    case 'danger':
      variantClasses = 'bg-rose-950/40 text-rose-300 border-rose-500/40';
      break;
    case 'info':
      variantClasses = 'bg-sky-950/40 text-earth-blue border-sky-500/40';
      break;
    case 'neutral':
    default:
      variantClasses = 'bg-space-800 text-slate-300 border-space-700';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium tracking-wide ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {variant === 'simulated' && (
        <span className="h-1.5 w-1.5 rounded-full bg-sun-amber animate-pulse" aria-hidden="true" />
      )}
      {variant === 'success' && (
        <span className="h-1.5 w-1.5 rounded-full bg-comms-green" aria-hidden="true" />
      )}
      {defaultLabel}
    </span>
  );
}
