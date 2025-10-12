import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3BA88E",
          dark: "#2D8973",
          light: "#E7F6F1",
        },
      },
      keyframes: {
        "sheet-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "sheet-up": "sheet-up 0.32s cubic-bezier(0.25, 0.8, 0.25, 1) forwards",
      },
    },
  },
  plugins: [],
};

export default config;
