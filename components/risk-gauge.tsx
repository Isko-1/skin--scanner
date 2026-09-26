import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";

export function riskLevel(score: number): { label: string; color: string; level: "low" | "medium" | "high" } {
  if (score >= 0.7) return { label: "Высокий риск", color: "#f43f5e", level: "high" };
  if (score >= 0.3) return { label: "Средний риск", color: "#f59e0b", level: "medium" };
  return { label: "Низкий риск", color: "#10b981", level: "low" };
}

/** 
 * Circular gauge showing risk_score as a percentage with clinical color coding.
 */
export function RiskGauge({ score, size = "size-14 text-xs" }: { score: number; size?: string }) {
  const { color } = riskLevel(score);
  return (
    <div className="relative inline-flex items-center justify-center">
      <AnimatedCircularProgressBar
        value={Math.round(score * 100)}
        gaugePrimaryColor={color}
        gaugeSecondaryColor="rgba(255, 255, 255, 0.08)"
        className={size}
      />
    </div>
  );
}
