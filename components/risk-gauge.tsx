import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { BorderBeam } from "@/components/ui/border-beam";

export function riskLevel(score: number): { label: string; color: string } {
  if (score >= 0.7) return { label: "Высокий риск", color: "var(--color-destructive)" };
  if (score >= 0.3) return { label: "Средний риск", color: "var(--color-warning)" };
  return { label: "Низкий риск", color: "var(--color-success)" };
}

/** Circular gauge showing risk_score as a percentage — carries the magnitude
 *  a text badge alone loses (0.31 and 0.69 both read as "medium/high" otherwise). */
export function RiskGauge({ score, size = "size-16 text-xs" }: { score: number; size?: string }) {
  const { color } = riskLevel(score);
  const gauge = (
    <AnimatedCircularProgressBar
      value={Math.round(score * 100)}
      gaugePrimaryColor={color}
      gaugeSecondaryColor="var(--color-muted)"
      className={size}
    />
  );

  // The traveling ring is reserved for high risk on purpose — it's meant to
  // draw the eye to what actually needs attention, not to decorate every
  // gauge. Sprinkling it on medium/low scores too would just be noise, and
  // would dilute the one case where it's actually useful.
  if (score >= 0.7) {
    return (
      <BorderBeam color={color} duration={2.5}>
        {gauge}
      </BorderBeam>
    );
  }

  return gauge;
}
