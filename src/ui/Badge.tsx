import React from 'react';

export type BadgeVariant =
  | 'simulated'
  | 'no-terrain'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'info'
  | 'amber'
  | 'emerald'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export function Badge({
  variant = 'neutral',
  size = 'sm',
  className = '',
  children,
  ...props
}: BadgeProps): React.JSX.Element {
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-3 py-1 text-xs'
      : 'px-2.5 py-1 text-xs';

  let variantClasses = 'bg-panel text-muted border-panel-border';
  let defaultLabel = children;

  switch (variant) {
    case 'simulated':
      variantClasses = 'bg-amber/10 text-amber border-amber/30';
      defaultLabel = children ?? 'Simulated terrain';
      break;
    case 'no-terrain':
      variantClasses = 'bg-panel/60 text-muted border-panel-border border-dashed';
      defaultLabel = children ?? 'Terrain not included';
      break;
    case 'success':
    case 'emerald':
      variantClasses = 'bg-emerald/10 text-emerald border-emerald/30';
      break;
    case 'warning':
      variantClasses = 'bg-warning/10 text-warning border-warning/30';
      break;
    case 'danger':
    case 'critical':
      variantClasses = 'bg-critical/10 text-critical border-critical/30';
      break;
    case 'info':
    case 'amber':
      variantClasses = 'bg-amber/10 text-amber border-amber/30';
      break;
    case 'neutral':
    default:
      variantClasses = 'bg-panel text-muted border-panel-border';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded-full border ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {defaultLabel}
    </span>
  );
}
