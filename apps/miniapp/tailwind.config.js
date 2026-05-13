/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dokonly design tokens (from design.md)
        accent: {
          DEFAULT: '#00B383',
          dark: '#00D199',
          soft: '#ECFDF5',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
