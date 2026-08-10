"use client";

// Source: MagicUI registry (number-ticker), fetched via the magicui MCP tool —
// reimplemented with a plain requestAnimationFrame tween instead of pulling in
// the `motion` package as a new dependency for one small counter (ponytail
// rung 6: the codebase already has zero animation libs, ~1KB of rAF code does
// the same job as pulling in a whole spring-physics library).
import { useEffect, useRef, useState } from "react";

interface NumberTickerProps {
  value: number;
  decimalPlaces?: number;
  className?: string;
}

const DURATION_MS = 700;
// easeOutCubic — starts fast, settles gently, matches the 150-300ms+ "meaningful
// motion" guidance without needing a physics engine for a single value change.
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function NumberTicker({ value, decimalPlaces = 0, className }: NumberTickerProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;
        observer.disconnect();

        const start = performance.now();
        function tick(now: number) {
          const progress = Math.min((now - start) / DURATION_MS, 1);
          setDisplay(value * easeOutCubic(progress));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {display.toFixed(decimalPlaces)}
    </span>
  );
}
