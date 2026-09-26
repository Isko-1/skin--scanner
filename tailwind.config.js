/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        fadeIn:     { from: { opacity: "0" }, to: { opacity: "1" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "fade-in":  "fadeIn 180ms ease-out",
        "slide-up": "slide-up 220ms ease-out both",
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
