/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
        accent: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        dark: {
          900: '#0a0910',
          800: '#0f0e1a',
          700: '#161428',
          600: '#1d1a35',
          500: '#252142',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #0f0e1a 0%, #1d1a35 50%, #0a1628 100%)',
      },
      boxShadow: {
        'glow-violet': '0 0 24px rgba(124, 58, 237, 0.4)',
        'glow-green':  '0 0 24px rgba(16, 185, 129, 0.35)',
        'glow-blue':   '0 0 24px rgba(59, 130, 246, 0.35)',
        'card':        '0 4px 24px rgba(0,0,0,0.07)',
        'card-hover':  '0 8px 40px rgba(0,0,0,0.12)',
        'inner-glow':  'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
};
