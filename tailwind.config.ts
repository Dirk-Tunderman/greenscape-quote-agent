import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "mojave-green": {
          DEFAULT: "#2C4A3A",
          light: "#4A6B57",
        },
        sandstone: "#D4B896",
        "caliche-white": "#F8F4ED",
        adobe: "#E8DFD2",
        "sunset-terracotta": "#B8623E",
        "amber-hour": "#D4904E",
        "saguaro-black": "#1A1F1A",
        "stone-gray": "#6B7064",
        "mesa-gray": "#9B9F98",
        "success-green": "#4A7C59",
        "warning-amber": "#C7902C",
        "error-brick": "#A14B3C",
        "info-sky": "#5A7B8C",
        "lost-gray": "#847F75",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "-apple-system", "system-ui", "sans-serif"],
      },
      maxWidth: {
        "6xl": "72rem",
      },
      letterSpacing: {
        "tightest-display": "-0.02em",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(26 31 26 / 0.04)",
        card: "0 1px 3px 0 rgb(26 31 26 / 0.06), 0 1px 2px -1px rgb(26 31 26 / 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
