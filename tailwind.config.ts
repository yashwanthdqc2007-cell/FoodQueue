import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        brand: {
          bg: "#0E1211",
          "bg-secondary": "#121916",
          surface: "#19211D",
          card: "#202923",
          forest: "#216747",
          "forest-dark": "#0E1211",
          primary: "#39C779",
          "primary-hover": "#2EB068",
          "primary-light": "#162E22",
          mint: "#B4F2C9",
          "mint-light": "#14281E",
          cream: "#121916",
          text: "#F5F7F5",
          "text-muted": "#A3B1A8",
          border: "#303A35",
          muted: "#A3B1A8",
          violet: "#A999FF",
          "violet-light": "#25203B",
          amber: "#F6B95A",
          "amber-light": "#2F2414",
          red: "#FF7777",
          "red-light": "#331818",
          // Official FoodQueue Brand Palette
          "forest-green": "#166534",
          "fresh-green": "#16A34A",
          "lime": "#A3E635",
          "food-amber": "#F59E0B",
          "dark-bg": "#0B1220",
          "light-surface": "#F8FAFC",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
