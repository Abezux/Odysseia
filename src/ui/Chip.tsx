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
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  const activeClasses = active
    ? 'bg-space-700 text-sun-amber border-sun-amber/50 font-medium'
    : 'bg-space-900/60 text-slate-400 border-space-700 hover:text-slate-200 hover:bg-space-800';

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-sun-amber/50 ${sizeClasses} ${activeClasses} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
