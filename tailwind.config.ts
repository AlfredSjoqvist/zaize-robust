
import type { Config } from "tailwindcss";
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#0a0a0a",
          600: "#0a0a0a",
          700: "#000000",
          800: "#000000",
          900: "#000000"
        }
      },
      boxShadow: { soft: "0 4px 20px rgba(0,0,0,0.06)" },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" }
    }
  },
  plugins: [],
} satisfies Config;
