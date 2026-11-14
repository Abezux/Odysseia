import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          950: '#05070D',
          900: '#0B0F19',
          800: '#131B2E',
          700: '#1E2942',
          600: '#2F3E61'
        },
        sun: {
          amber: '#F59E0B',
          glow: '#FCD34D'
        },
        earth: {
          blue: '#38BDF8',
          deep: '#0284C7'
        },
        shadow: {
          indigo: '#6366F1',
          crater: '#080C16'
        },
        comms: {
          green: '#10B981',
          signal: '#34D399'
        },
        warning: {
          red: '#EF4444',
          orange: '#F97316'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
} satisfies Config;
