import { type ReactNode } from "react";

// Adapted from MagicUI's Blur Fade (fetched via the magicui MCP tool) —
// reimplemented as a plain CSS @keyframes animation (see blur-fade-in in
// globals.css) instead of pulling in the `motion` package for a one-shot
// entrance effect. Same fade + rise + blur-out read, no new dependency —
// consistent with number-ticker/ripple/border-beam/animated-gradient-text
// elsewhere in this folder.
export function BlurFade({
  children,
  delay = 0,
  duration = 0.4,
  className,
}: {
  children: ReactNode;
  /** Seconds before this item's animation starts — stagger a list by
   *  passing index * 0.05 or similar per item. */
  delay?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        animation: `blur-fade-in ${duration}s ease-out both`,
        animationDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
