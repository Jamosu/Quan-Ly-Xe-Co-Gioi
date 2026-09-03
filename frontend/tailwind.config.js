/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F2F7F4',
          100: '#E7F1EA',
          200: '#C2DEC9',
          300: '#94C6A0',
          400: '#5FA872',
          500: '#2E8B4C',
          600: '#1B743B',
          DEFAULT: '#0F5F2A', // THACO AGRI Official Brand Green
          700: '#0F5F2A',
          800: '#0C4E23',
          900: '#0A431E',
          950: '#052611',
          dark: '#0A431E',
          light: '#E7F1EA',
        },
        agri: {
          lime: '#B8D83D',
          amber: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
          slate: '#17211D',
          muted: '#6F7C75',
          card: '#FFFFFF',
          border: '#E2E8E5',
          bg: '#F4F6F5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Manrope', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        xl: '12px',
        '2xl': '16px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        card: '0 2px 8px -2px rgba(15,95,42,0.06), 0 1px 4px -1px rgba(0,0,0,0.04)',
        hover: '0 8px 24px -4px rgba(15,95,42,0.12), 0 4px 8px -2px rgba(0,0,0,0.06)',
      }
    },
  },
  plugins: [],
};
