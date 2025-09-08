/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f4f8ff",
          100: "#e8f0ff",
          200: "#c8daff",
          300: "#a8c4ff",
          400: "#7aa6ff",
          500: "#4c88ff",
          600: "#2c6af6",
          700: "#1f50c4",
          800: "#173b91",
          900: "#102761",
        },
      },
    },
  },
  plugins: [],
};
