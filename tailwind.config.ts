import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#F7F3EA",
        sand: "#D9C7AD",
        sage: "#9BA58A",
        olive: "#555B43",
        terracotta: "#B66E50",
        espresso: "#302820",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Jost"', "system-ui", "sans-serif"],
      },
      letterSpacing: { brand: "0.32em" },
    },
  },
  plugins: [],
};

export default config;
