/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        fadeIn:     { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "risk-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(225, 29, 72, 0.35)" },
          "50%":      { boxShadow: "0 0 0 6px rgba(225, 29, 72, 0)" },
        },
      },
      animation: {
        "fade-in":  "fadeIn 180ms ease-out",
        "slide-up": "slide-up 220ms ease-out both",
        // Used on RiskGauge for score >= 0.7 only — a slow rose-colored ring
        // pulse that draws the eye to results that actually need attention,
        // not decoration on every gauge (see risk-gauge.tsx for the guard).
        "risk-pulse": "risk-pulse 2.2s ease-out infinite",
      },
      colors: {
        surface:     "#0f172a",
        "surface-2": "#172033",
        "surface-3": "#1e293b",
      },
    },
  },
  plugins: [],
};
