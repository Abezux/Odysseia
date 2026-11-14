/**
 * Design Tokens for LunarSite Compare
 * Dark cinematic mission-control palette.
 */

export const colors = {
  space: {
    950: '#05070D',
    900: '#0B0F19',
    800: '#131B2E',
    700: '#1E2942',
    600: '#2F3E61',
    border: 'rgba(255, 255, 255, 0.08)',
    glass: 'rgba(11, 15, 25, 0.75)'
  },
  sun: {
    amber: '#F59E0B',
    glow: '#FCD34D',
    dim: '#78350F'
  },
  earth: {
    blue: '#38BDF8',
    deep: '#0284C7',
    dim: '#075985'
  },
  shadow: {
    indigo: '#6366F1',
    crater: '#080C16'
  },
  comms: {
    green: '#10B981',
    signal: '#34D399',
    dim: '#064E3B'
  },
  warning: {
    red: '#EF4444',
    orange: '#F97316'
  }
} as const;

export const typography = {
  fonts: {
    sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, monospace'
  }
} as const;
