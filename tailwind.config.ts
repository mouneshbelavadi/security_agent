import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: "#FFFFFF",
        border: {
          DEFAULT: "#E2E8F0",
          strong: "#CBD5E1",
        },
        ink: {
          DEFAULT: "#0F172A",
          muted: "#475569",
          subtle: "#64748B",
        },
        accent: {
          DEFAULT: "#0284C7",
          hover: "#0369A1",
          light: "#E0F2FE",
        },
        success: {
          DEFAULT: "#15803D",
          hover: "#166534",
          bg: "#F0FDF4",
          border: "#BBF7D0",
          text: "#14532D",
        },
        warning: {
          DEFAULT: "#B45309",
          hover: "#92400E",
          bg: "#FFFBEB",
          border: "#FDE68A",
          text: "#78350F",
        },
        danger: {
          DEFAULT: "#B91C1C",
          hover: "#991B1B",
          bg: "#FEF2F2",
          border: "#FECACA",
          text: "#7F1D1D",
        },
      },
      borderRadius: {
        DEFAULT: "6px",
        none: "0px",
        sm: "4px",
        md: "6px",
        lg: "6px",
        xl: "6px",
      },
      fontFamily: {
        sans: ["'Inter Variable'", "-apple-system", "BlinkMacSystemFont", "'Segoe UI'", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      minHeight: {
        "guard-btn": "56px",
      },
    },
  },
  plugins: [],
};

export default config;
