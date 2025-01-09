/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        dos: ['DOS', 'monospace'],
      },
      colors: {
        'dos-green': '#33ff33',
      }
    },
  },
  plugins: [],
};