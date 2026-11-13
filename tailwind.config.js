/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crimson: '#D71935',
        navy: '#071935',
        charcoal: '#171717',
        brand: {
          red: '#D71935',
          darkred: '#8F1026',
          grey: '#E8EAED',
          black: '#171717',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        display: ['Barlow Condensed', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
