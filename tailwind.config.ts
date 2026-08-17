import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#0B0B0B",
          gold: "#B08D2B"
        }
      }
    }
  },
  plugins: []
} satisfies Config;

