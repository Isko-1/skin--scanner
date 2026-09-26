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
        // Used for AnimatedCircularProgressBar's center number, and for
        // crossfading between /capture's phases (camera/review/uploading/
        // error). Plain opacity — GSAP's "Subtle" page-transition preset
        // (ui-ux-pro-max --domain gsap) recommends exactly this duration
        // range (200-300ms) and an inOut-style ease for state changes that
        // aren't a full route navigation; power1.inOut maps closely enough
        // to Tailwind's built-in `ease-in-out` that pulling in GSAP for one
        // opacity tween isn't worth a new dependency (same reasoning as
        // number-ticker.tsx choosing rAF over `motion`).
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        // Used by AnimatedGradientText and Ripple (components/ui) — sourced
        // from the MagicUI registry, reimplemented as plain CSS keyframes
        // instead of pulling in the `motion` package for two small loops.
        gradient: "gradient 4s linear infinite",
        ripple: "ripple 2.5s ease-out infinite",
        "fade-in": "fadeIn 220ms ease-in-out",
      },
    },
  },
  plugins: [],
};
