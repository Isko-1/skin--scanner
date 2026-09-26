import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";

export function riskLevel(score: number): { label: string; color: string; level: "low" | "medium" | "high" } {
  if (score >= 0.7) return { label: "Высокий риск", color: "#e11d48", level: "high" };
  if (score >= 0.3) return { label: "Средний риск", color: "#d97706", level: "medium" };
  return { label: "Низкий риск", color: "#16a34a", level: "low" };
}

/** 
 * Circular gauge showing risk_score as a percentage with light clinical color coding.
 */
export function RiskGauge({ score, size = "size-14 text-xs" }: { score: number; size?: string }) {
  const { color } = riskLevel(score);
  return (
    <div className="relative inline-flex items-center justify-center">
      <AnimatedCircularProgressBar
        value={Math.round(score * 100)}
        gaugePrimaryColor={color}
        gaugeSecondaryColor="#f1f5f9"
        className={size}
      />
    </div>
  );
}
