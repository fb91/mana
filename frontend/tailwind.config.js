/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta cálida — cremas, dorados, marrones
        crema: {
          50:  '#FDFAF5',
          100: '#FAF7F0',
          200: '#F5EDD8',
          300: '#EDD9B0',
          DEFAULT: '#FAF7F2',
        },
        dorado: {
          light: '#D4A853',
          DEFAULT: '#8B6914',
          dark:  '#6B4F0D',
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
          border:  '#3D2E20',
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
      },
    },
  },
  plugins: [],
}
