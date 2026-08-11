import { type ComponentPropsWithoutRef, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Adapted from MagicUI registry (ripple), fetched via the magicui MCP tool.
// The original's circle sizing (default 210px, +70px per ring) is built for
// a hero-section backdrop; ours needs to fit behind a 64px shutter button,
// so mainCircleSize/spacing are exposed as props instead of hardcoded.
// Still zero dependencies — just Tailwind's `animate-ripple` utility (added
// in tailwind.config.js). Color comes from `currentColor`, so it inherits
// whatever text color class the parent sets.
interface RippleProps extends ComponentPropsWithoutRef<"div"> {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  spacing?: number;
}

export function Ripple({
  mainCircleSize = 40,
  mainCircleOpacity = 0.3,
  numCircles = 3,
  spacing = 22,
  className,
  ...props
}: RippleProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle,white,transparent_80%)]",
        className
      )}
      {...props}
    >
      {Array.from({ length: numCircles }, (_, i) => {
        const size = mainCircleSize + i * spacing;
        const opacity = mainCircleOpacity - i * (mainCircleOpacity / numCircles);
        return (
          <div
            key={i}
            className="animate-ripple absolute rounded-full border"
            style={
              {
                width: size,
                height: size,
                opacity,
                animationDelay: `${i * 0.4}s`,
                borderColor: "currentColor",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%) scale(1)",
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
