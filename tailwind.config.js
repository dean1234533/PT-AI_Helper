/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      colors: {
        // DB's Workouts brand red — driven by CSS variables (see src/index.css
        // for defaults) so a managed client's trainer's brand color can override
        // it at runtime via useTrainerBranding + src/utils/color.js.
        brand: {
          50:  'rgb(var(--brand-50-rgb) / <alpha-value>)',
          100: 'rgb(var(--brand-100-rgb) / <alpha-value>)',
          200: 'rgb(var(--brand-200-rgb) / <alpha-value>)',
          300: 'rgb(var(--brand-300-rgb) / <alpha-value>)',
          400: 'rgb(var(--brand-400-rgb) / <alpha-value>)',
          500: 'rgb(var(--brand-500-rgb) / <alpha-value>)',
          600: 'rgb(var(--brand-600-rgb) / <alpha-value>)',
          700: 'rgb(var(--brand-700-rgb) / <alpha-value>)',
          800: 'rgb(var(--brand-800-rgb) / <alpha-value>)',
          900: 'rgb(var(--brand-900-rgb) / <alpha-value>)',
          950: 'rgb(var(--brand-950-rgb) / <alpha-value>)',
        },
        accent: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        // Dark palette matching website (#050810, #0d1322)
        dark: {
          900: '#020206',
          800: '#050810',
          700: '#090d1a',
          600: '#0d1322',
          500: '#131b2e',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #050810 0%, #0d1322 50%, #020206 100%)',
      },
      boxShadow: {
        'glow-blue-brand': '0 0 24px rgba(179, 0, 24, 0.4)',
        'glow-green':      '0 0 24px rgba(16, 185, 129, 0.35)',
        'glow-blue':       '0 0 24px rgba(179, 0, 24, 0.35)',
        'glow-violet':     '0 0 24px rgba(179, 0, 24, 0.4)',
        'card':            '0 4px 24px rgba(0,0,0,0.07)',
        'card-hover':      '0 8px 40px rgba(0,0,0,0.12)',
        'inner-glow':      'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      animation: {
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [],
};
