import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
      extend: {
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
      },
      colors: {
        arbor: {
          green: "#06402B",        // Deep forest green
          mint: "#E8F4EC",         // Soft mint background / badges
          darkmint: "#10B981",     // Pop mint
          bg: "#F7F9F7",           // Off-white background
          card: "#FFFFFF",         // White cards
          border: "#E2E8F0",       // Subtle gray borders
          text: "#1E293B",         // Main text
          textmuted: "#64748B",    // Muted slate gray
        },
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -5px rgba(0, 0, 0, 0.05), 0 2px 10px -5px rgba(0, 0, 0, 0.03)',
        'micro': '0 2px 8px -2px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
};

export default config;