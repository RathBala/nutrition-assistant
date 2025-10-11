/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#5D5FEF',
          light: '#eef2ff'
        },
        surface: '#f8fafc'
      }
    }
  },
  plugins: []
};
