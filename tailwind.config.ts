import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#f8f9fa",
        surface: "#ffffff",
        "surface-soft": "#f3f4f5",
        "surface-border": "#e5e7eb",
        "surface-muted": "#d9dadb",
        primary: "#00c2cb",
        "primary-dark": "#00696e",
        "primary-soft": "#e6fbfc",
        accent: "#fb9651",
        text: "#191c1d",
        "text-muted": "#5a6466",
        outline: "#bbc9ca",
        success: "#16a34a",
        danger: "#dc2626"
      },
      boxShadow: {
        card: "0 4px 20px rgba(0, 0, 0, 0.04)",
        lift: "0 14px 30px rgba(0, 0, 0, 0.08)"
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};

export default config;
