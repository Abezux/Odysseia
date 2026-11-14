/**
 * Design Tokens for Odysseia
 * Near-black warm void ground with one committed amber accent.
 * No blue, violet or cyan anywhere. Radii 0 everywhere.
 */

export const colors = {
  ground: '#0B0A09',
  secondaryGround: '#12110F',
  panel: '#1A1816',
  ink: '#F4EFE8',
  muted: '#8A847B',
  amber: {
    DEFAULT: '#F5A524',
    pressed: '#C77F0A',
    paleGold: '#FFD58A'
  },
  hairline: 'rgba(255, 240, 220, 0.10)',
  hairlineSubtle: 'rgba(255, 240, 220, 0.06)'
} as const;

export const typography = {
  fonts: {
    sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, monospace'
  }
} as const;
