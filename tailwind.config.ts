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
    },
  },
  plugins: [],
};

export default config;
