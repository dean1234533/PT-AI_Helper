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
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
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
        'glow-blue-brand': '0 0 24px rgba(37, 99, 235, 0.4)',
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