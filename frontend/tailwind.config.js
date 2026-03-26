/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta cálida fija — usada principalmente por el tema oscuro y como base
        crema: {
          50:  '#FDFAF5',
          100: '#FAF7F0',
          200: '#E8E1D9',  // borde suave (antes #F5EDD8)
          300: '#D4C5B5',  // borde más marcado (antes #EDD9B0)
          DEFAULT: '#FAF7F2',
        },
        cafe: {
          light: '#7A6F63',   // texto secundario claro (antes #C4956A)
          DEFAULT: '#8C5A2B', // primario/acción claro (antes #7C4A1E)
          dark:  '#2E2A25',   // texto primario claro (antes #4A2A0E)
        },
        // Modo oscuro — cálido, no azulado
        oscuro: {
          bg:      '#1C1510',
          surface: '#261D15',
          card:    '#2E2016',
          border:  '#3D2E20',
        },
        // Acento dinámico — cambia según el tema activo (CSS variables)
        dorado: {
          light: 'rgb(var(--accent-light) / <alpha-value>)',
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark:  'rgb(var(--accent-dark) / <alpha-value>)',
        },
        // Tokens de diseño — variables CSS que se actualizan por tema
        token: {
          bg:       'rgb(var(--color-bg) / <alpha-value>)',
          surface:  'rgb(var(--color-surface) / <alpha-value>)',
          surface2: 'rgb(var(--color-surface-2) / <alpha-value>)',
          text:     'rgb(var(--color-text-primary) / <alpha-value>)',
          muted:    'rgb(var(--color-text-secondary) / <alpha-value>)',
          border:   'rgb(var(--color-border) / <alpha-value>)',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'slide-out-left': 'slideOutLeft 0.2s ease-in forwards',
        'slide-out-right': 'slideOutRight 0.2s ease-in forwards',
        'slide-in': 'slideIn 0.25s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'fade-out': 'fadeOut 0.4s ease-in forwards',
        'float-particle': 'floatParticle var(--duration, 2s) ease-out var(--delay, 0s) forwards',
        'pop-in': 'popIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.2)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '80%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        floatParticle: {
          '0%': { transform: 'translateY(0) rotate(0deg) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-220px) rotate(540deg) scale(0)', opacity: '0' },
        },
        popIn: {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '60%': { transform: 'scale(1.08) rotate(3deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-40px)', opacity: '0' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(40px)', opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
