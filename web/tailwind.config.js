const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: { 
      colors: { ...colors },
      fontFamily: {
        sans: [
          '"Helvetica Neue"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          '"Share Tech Mono"',
          '"Space Mono"',
          '"Roboto Mono"',
          '"VT323"',
          '"Courier New"',
          'monospace',
        ],
      }
    },
  },
  darkMode: "class",
  plugins: [],
};