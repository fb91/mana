/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta cálida — cremas, marrones (fija)
        crema: {
          50:  '#FDFAF5',
          100: '#FAF7F0',
          200: '#F5EDD8',
          300: '#EDD9B0',
          DEFAULT: '#FAF7F2',
        },
        cafe: {
          light: '#C4956A',
          DEFAULT: '#7C4A1E',
          dark:  '#4A2A0E',
        },
        // Modo oscuro — cálido, no azulado
        oscuro: {
          bg:      '#1C1510',
          surface: '#261D15',
          card:    '#2E2016',
          border:  '#3D2E20',
        },
        // Acento — cambia según el tema activo (CSS variables)
        dorado: {
          light: 'rgb(var(--accent-light) / <alpha-value>)',
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          dark:  'rgb(var(--accent-dark) / <alpha-value>)',
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
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
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
