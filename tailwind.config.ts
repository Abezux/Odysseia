import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ground: '#0B0A09',
        'secondary-ground': '#12110F',
        panel: '#1A1816',
        ink: '#F4EFE8',
        muted: '#8A847B',
        amber: {
          DEFAULT: '#F5A524',
          pressed: '#C77F0A',
          gold: '#FFD58A'
        },
        hairline: 'rgba(255, 240, 220, 0.10)',
        'hairline-subtle': 'rgba(255, 240, 220, 0.06)'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px'
      }
    }
  },
  plugins: []
} satisfies Config;
