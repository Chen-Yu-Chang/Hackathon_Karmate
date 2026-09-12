/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        karma: {
          50: "#fff1f0",
          100: "#ffe1de",
          400: "#ff6b57",
          500: "#f4402a",
          600: "#d92c18",
          700: "#b32013",
        },
      },
    },
  },
  plugins: [],
};
