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
        'bg-amber text-amber-text font-semibold hover:bg-amber-hover active:bg-amber-pressed focus-visible:ring-amber/50 shadow-sm shadow-amber/10',
      secondary:
        'bg-panel text-ink border border-panel-border hover:bg-[#25221F] hover:border-muted/50 focus-visible:ring-amber/30',
      outline:
        'bg-transparent border border-panel-border text-muted hover:text-ink hover:border-muted/60 focus-visible:ring-amber/30',
      ghost:
        'bg-transparent text-muted hover:text-ink hover:bg-panel/60 focus-visible:ring-amber/30',
      danger:
        'bg-critical/15 border border-critical/40 text-critical hover:bg-critical/25 focus-visible:ring-critical/50'
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center rounded-lg font-sans transition-all select-none disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
