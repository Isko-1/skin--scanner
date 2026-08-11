import { type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

// Source: MagicUI registry (animated-gradient-text), fetched via the magicui
// MCP tool. The original has zero dependencies of its own — just Tailwind's
// `animate-gradient` utility (added in tailwind.config.js) — so it's used
// as-is, only re-pointed at our palette instead of the demo's orange/purple.
export interface AnimatedGradientTextProps extends ComponentPropsWithoutRef<"span"> {
  speed?: number;
  colorFrom?: string;
  colorTo?: string;
}

export function AnimatedGradientText({
  children,
  className,
  speed = 1,
  colorFrom = "var(--color-primary)",
  colorTo = "var(--color-accent)",
  style,
  ...props
}: AnimatedGradientTextProps) {
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(90deg, ${colorFrom}, ${colorTo}, ${colorFrom})`,
        backgroundSize: `${speed * 300}% 100%`,
        ...style,
      }}
      className={cn("animate-gradient bg-clip-text text-transparent", className)}
      {...props}
    >
      {children}
    </span>
  );
}
