import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./styles/**/*.{ts,tsx,css}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#111111",
          accent: "#FFFFFF"
        }
      },
      fontFamily: {
        sans: ["'Helvetica Neue'", "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms")({
      strategy: "class"
    })
  ]
};

export default config;
