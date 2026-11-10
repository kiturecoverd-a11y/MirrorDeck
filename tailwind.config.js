/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#eef4ff',
          100: '#dbe7fe',
          200: '#bfd4fe',
          300: '#93b8fd',
          400: '#6092fa',
          500: '#3b6ff6',
          600: '#2550eb',
          700: '#1d3dd8',
          800: '#1f34ae',
          900: '#1e3089',
          950: '#172053',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.06)',
        pop: '0 8px 30px rgba(16,24,40,0.14)',
      },
    },
  },
  plugins: [],
}
