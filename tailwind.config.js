/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      keyframes: {
        gradient: { to: { backgroundPosition: "200% center" } },
        ripple: {
          "0%, 100%": { transform: "translate(-50%, -50%) scale(1)" },
          "50%": { transform: "translate(-50%, -50%) scale(1.15)" },
        },
      },
      animation: {
        // Used by AnimatedGradientText and Ripple (components/ui) — sourced
        // from the MagicUI registry, reimplemented as plain CSS keyframes
        // instead of pulling in the `motion` package for two small loops.
        gradient: "gradient 4s linear infinite",
        ripple: "ripple 2.5s ease-out infinite",
      },
    },
  },
  plugins: [],
};
