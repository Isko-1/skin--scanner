import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Inspired by MagicUI's Border Beam (fetched via the magicui MCP tool), but
// reimplemented with a conic-gradient + Tailwind's built-in `animate-spin`
// instead of the original's `motion`-powered offset-path animation — same
// "light traveling around the edge" read, no new dependency, and no custom
// keyframe needed since animate-spin already ships with Tailwind.
export function BorderBeam({
  children,
  color = "var(--color-destructive)",
  duration = 3,
  rounded = "rounded-full",
  className,
}: {
  children: ReactNode;
  color?: string;
  duration?: number;
  rounded?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative inline-flex shrink-0 p-[2px]", rounded, className)}>
      <div
        className={cn("absolute inset-0 animate-spin", rounded)}
        style={{
          animationDuration: `${duration}s`,
          background: `conic-gradient(from 0deg, transparent 0%, ${color} 12%, transparent 28%)`,
        }}
      />
      <div className={cn("relative bg-[var(--color-card)]", rounded)}>{children}</div>
    </div>
  );
}
