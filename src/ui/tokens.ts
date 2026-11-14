/**
 * Design Tokens for Odysseia (Industrial Dark with Glassmorphism)
 */

export const colors = {
  ground: '#0B0A09',
  secondaryGround: '#12110F',
  panel: {
    solid: '#1A1816',
    border: '#2E2A26'
  },
  glass: {
    background: 'rgba(26, 24, 22, 0.9)',
    border: 'rgba(82, 74, 66, 0.4)'
  },
  ink: '#F4EFE8',
  muted: '#8A847B',
  amber: {
    DEFAULT: '#F5A524',
    hover: '#C77F0A',
    pressed: '#C77F0A',
    text: '#0B0A09'
  },
  semantic: {
    success: '#10B981',
    warning: '#E8590C',
    critical: '#EF4444'
  },
  scrollbar: {
    track: '#1A1816',
    thumb: '#4A433B'
  },
  hairline: 'rgba(255, 240, 220, 0.10)',
  hairlineSubtle: 'rgba(255, 240, 220, 0.06)'
} as const;

export const typography = {
  fonts: {
    sans: '"Plus Jakarta Sans", Inter, sans-serif',
    mono: '"JetBrains Mono", monospace'
  }
} as const;

export const radii = {
  container: '24px', // rounded-3xl
  card: '16px',      // rounded-2xl
  input: '8px',      // rounded-lg
  pill: '9999px'     // rounded-full
} as const;
