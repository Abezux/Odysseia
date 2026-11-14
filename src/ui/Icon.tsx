import React from 'react';
import type { LucideIcon } from 'lucide-react';

export type IconSize = 16 | 18 | 20;

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  label?: string;
}

/**
 * Shared production-grade Icon wrapper:
 * - 1.5px stroke width
 * - Round linecap & linejoin
 * - Allowed sizes: 16 | 18 | 20px
 * - Inherits currentColor
 * - Accessibility: decorative by default (aria-hidden="true") or receives aria-label when label is provided
 */
export function Icon({
  icon: LucideComponent,
  size = 16,
  className = '',
  label,
  ...props
}: IconProps): React.JSX.Element {
  return (
    <LucideComponent
      size={size}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={`shrink-0 ${className}`}
      {...props}
    />
  );
}
