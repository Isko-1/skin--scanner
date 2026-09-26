/**
 * Multimodal Risk Engine: merges computer-vision visual classification (HAM10000)
 * with diffuse-reflectance optical spectroscopy (AS7341 10-channel).
 *
 * Implements the "photo_primary" clinical safety protocol:
 * - Visual surface morphology (photo) provides the primary diagnostic foundation.
 * - Subsurface optical contrast (erythema at 540nm, melanin contrast at 650/950nm)
 *   can elevate clinical suspicion if subsurface vascularity or heavy pigment is detected.
 * - Under NO circumstance does a low spectral reading down-score an abnormal visual surface
 *   (a benign spectrum must never dismiss visual malignancy signs).
 */

export interface MultimodalResult {
  combinedScore: number;
  level: "low" | "moderate" | "high";
  levelLabel: string;
  photoScore: number | null;
  spectralScore: number | null;
  modality: "multimodal" | "photo_only" | "spectral_only";
  elevationDelta: number; // How much optical spectrum elevated the visual risk
  recommendation: string;
}

export function computeMultimodalRisk(
  photoScore: number | null | undefined,
  spectralScore: number | null | undefined
): MultimodalResult | null {
  const hasPhoto = typeof photoScore === "number" && !isNaN(photoScore);
  const hasSpectral = typeof spectralScore === "number" && !isNaN(spectralScore);

  if (!hasPhoto && !hasSpectral) {
    return null;
  }

  let combined = 0;
  let modality: MultimodalResult["modality"] = "photo_only";
  let elevationDelta = 0;

  if (hasPhoto && hasSpectral) {
    modality = "multimodal";
    const p = Math.max(0, Math.min(1, photoScore!));
    const s = Math.max(0, Math.min(1, spectralScore!));

    if (s > p) {
      // Optical absorption/erythema detected deeper anomalies: boost risk proportionally
      elevationDelta = Number(((s - p) * 0.35).toFixed(3));
      combined = Math.min(0.99, p + elevationDelta);
    } else {
      // Photo is higher: optical does NOT lower visual suspicion
      combined = p;
      elevationDelta = 0;
    }
  } else if (hasPhoto) {
    modality = "photo_only";
    combined = Math.max(0, Math.min(1, photoScore!));
  } else if (hasSpectral) {
    modality = "spectral_only";
    combined = Math.max(0, Math.min(1, spectralScore!));
  }

  combined = Number(combined.toFixed(3));

  let level: MultimodalResult["level"] = "low";
  let levelLabel = "Низкий риск";
  let recommendation = "Признаков атипии не выявлено. Рекомендуется повторный скрининг через 6–12 месяцев.";

  if (combined >= 0.7) {
    level = "high";
    levelLabel = "Повышенный риск";
    recommendation = "Обнаружены признаки оптической или морфологической атипии. Рекомендован очный осмотр врача-дерматоонколога и цифровая дерматоскопия.";
  } else if (combined >= 0.3) {
    level = "moderate";
    levelLabel = "Умеренный риск";
    recommendation = "Имеются пограничные оптические маркеры. Рекомендуется контрольный фотоскан через 1–2 месяца для оценки динамики.";
  }

  return {
    combinedScore: combined,
    level,
    levelLabel,
    photoScore: hasPhoto ? Number(photoScore!.toFixed(2)) : null,
    spectralScore: hasSpectral ? Number(spectralScore!.toFixed(2)) : null,
    modality,
    elevationDelta,
    recommendation,
  };
}
