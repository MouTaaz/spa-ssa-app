import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        "primary-dark": "#1e40af",
        secondary: "#64748b",
        accent: "#f97316",
        success: "#16a34a",
        warning: "#eab308",
        error: "#dc2626",
        background: "#ffffff",
        surface: "#f8fafc",
        border: "#e2e8f0",
        text: "#1e293b",
        "text-secondary": "#64748b",
      },
    },
  },
  plugins: [],
};

export default config;
