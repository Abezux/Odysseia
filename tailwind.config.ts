import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ground: '#0B0A09',
        'secondary-ground': '#12110F',
        panel: {
          DEFAULT: '#1A1816',
          solid: '#1A1816',
          border: '#2E2A26'
        },
        glass: {
          DEFAULT: 'rgba(26, 24, 22, 0.9)',
          border: 'rgba(82, 74, 66, 0.4)'
        },
        ink: '#F4EFE8',
        muted: '#8A847B',
        amber: {
          DEFAULT: '#F5A524',
          hover: '#C77F0A',
          pressed: '#C77F0A',
          gold: '#FFD58A',
          text: '#0B0A09'
        },
        emerald: {
          DEFAULT: '#10B981',
          400: '#34D399',
          500: '#10B981'
        },
        warning: {
          DEFAULT: '#E8590C',
          orange: '#E8590C'
        },
        critical: {
          DEFAULT: '#EF4444',
          red: '#EF4444'
        },
        hairline: 'rgba(255, 240, 220, 0.10)',
        'hairline-subtle': 'rgba(255, 240, 220, 0.06)'
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '8px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
        full: '9999px'
      }
    }
  },
  plugins: []
} satisfies Config;
