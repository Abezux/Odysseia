import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      icon,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'px-2.5 py-1 text-xs gap-1.5',
      md: 'px-3.5 py-1.5 text-sm gap-2',
      lg: 'px-4 py-2 text-base gap-2.5'
    }[size];

    const variantClasses = {
      primary:
        'bg-sun-amber text-space-950 font-semibold hover:bg-sun-glow focus-visible:ring-sun-amber/50 shadow-sm shadow-sun-amber/20',
      secondary:
        'bg-space-800 text-slate-200 border border-space-700 hover:bg-space-700 hover:text-white focus-visible:ring-slate-400',
      outline:
        'bg-transparent border border-space-600 text-slate-300 hover:bg-space-800 hover:text-white focus-visible:ring-slate-400',
      ghost:
        'bg-transparent text-slate-300 hover:bg-space-800/60 hover:text-white focus-visible:ring-slate-400',
      danger:
        'bg-warning-red/20 border border-warning-red/50 text-rose-300 hover:bg-warning-red/30 focus-visible:ring-rose-500'
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center rounded transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
