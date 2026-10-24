import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "[data-theme='dark']"],
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["IBM Plex Sans Arabic", "sans-serif"] },
      colors: {
        brand: { DEFAULT: "#534AB7", dark: "#3C3489", light: "#EEEDFE" },
        success: "#1D9E75",
        warning: "#BA7517",
        danger: "#E24B4A"
      },
      boxShadow: { card: "0 1px 2px rgba(18,18,32,.04), 0 8px 30px rgba(18,18,32,.04)" }
    }
  },
  plugins: []
};

export default config;
