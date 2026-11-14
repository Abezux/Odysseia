import React from 'react';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  size?: 'sm' | 'md';
}

export function Chip({
  active = false,
  size = 'sm',
  className = '',
  children,
  ...props
}: ChipProps): React.JSX.Element {
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const activeClasses = active
    ? 'bg-amber text-amber-text border-amber font-semibold shadow-sm'
    : 'bg-panel text-muted border-panel-border hover:text-ink hover:border-muted/60';

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-full border font-sans transition-all select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/50 ${sizeClasses} ${activeClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
