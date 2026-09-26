// AS7341 channel handling, shared between app/api/spectral/route.ts (which
// receives the raw counts from the probe over WiFi) and any UI that displays
// them. Kept framework-agnostic — no Next.js/Supabase imports — so it works
// equally in an API route and a "use client" component.

export const CHANNEL_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6", "f7", "f8", "clear", "nir"] as const;
export type ChannelKey = (typeof CHANNEL_KEYS)[number];
export type SpectralChannels = Record<ChannelKey, number>;

export function isSpectralChannels(value: unknown): value is SpectralChannels {
  if (!value || typeof value !== "object") return false;
  return CHANNEL_KEYS.every((k) => typeof (value as Record<string, unknown>)[k] === "number");
}

// --- Reference-normalized contrast -----------------------------------------
//
// Research finding (Fitzpatrick-normalization literature, Aug 2026 review):
// comparing a lesion reading in isolation confounds lesion biology with skin
// tone — a benign mole on dark skin and the same mole on light skin produce
// very different raw reflectance for reasons that have nothing to do with
// malignancy. The fix the literature converges on is: measure the lesion AND
// adjacent normal skin, and work with the CONTRAST between them
// (ln(lesion/reference) per channel), never the raw lesion reading alone.
// This is why every function below takes a `reference` argument — there is
// deliberately no single-reading code path anymore.

/** ln(lesion/reference) per channel — the reference-normalized contrast the
 *  rest of this module works from instead of raw reflectance. */
export function computeContrast(lesion: SpectralChannels, reference: SpectralChannels): SpectralChannels {
  const contrast = {} as SpectralChannels;
  for (const k of CHANNEL_KEYS) {
    contrast[k] = Math.log(Math.max(lesion[k], 1) / Math.max(reference[k], 1));
  }
  return contrast;
}

// --- Literature-anchored wavelength ratios ----------------------------------
//
// Candidate wavelength pairs from two independent studies reviewed alongside
// this code (see PR/chat notes): 540/650/950nm (melanoma-vs-common-nevus
// discriminant criterion) and 450/590/950nm (ML wavelength-selection study
// over 450-950nm). Mapped to the nearest AS7341 channel centers:
//   450nm -> f2 (445nm)   540nm -> f5 (555nm)   590nm -> f6 (590nm, exact)
//   650nm -> f7 (630nm)   950nm -> nir (~910nm, the sensor's only NIR channel)
// These are the ONLY channels used for classification below — f1/f3/f4/f8/
// clear are captured (useful for future analysis) but deliberately not fed
// into riskScore/pattern matching, since using channels the cited literature
// didn't validate would just be re-introducing the same "made up direction"
// problem this replaced.
//
// IMPORTANT: the literature identifies WHICH ratios are diagnostically
// useful, not WHAT VALUES separate benign from malignant — the same review
// explicitly found no reliable published table of absolute or contrast
// thresholds. So this computes the six features honestly; see
// lib/spectral-patterns.ts for how (little) can legitimately be claimed
// about what a given value of them means.
export interface LiteratureRatios {
  r540_650: number;
  r540_950: number;
  r650_950: number;
  r450_590: number;
  r450_950: number;
  r590_950: number;
}

export function computeLiteratureRatios(contrast: SpectralChannels): LiteratureRatios {
  // Each feature is contrast(λi) - contrast(λj), which equals
  // ln((lesion_i/ref_i) / (lesion_j/ref_j)) — the between-wavelength ratio
  // of the already reference-normalized spectrum, per the cited protocol.
  return {
    r540_650: contrast.f5 - contrast.f7,
    r540_950: contrast.f5 - contrast.nir,
    r650_950: contrast.f7 - contrast.nir,
    r450_590: contrast.f2 - contrast.f6,
    r450_950: contrast.f2 - contrast.nir,
    r590_950: contrast.f6 - contrast.nir,
  };
}

export interface SpectralIndices {
  /** r540_650 — the specific pair used as a melanoma/nevus discriminant criterion in the cited literature. */
  erythemaIndex: number;
  /** r650_950 — red-vs-NIR contrast, literature-anchored analogue of the old raw f8/nir heuristic. */
  melaninIndex: number;
  /** 0-1, same scale as photo_analyses.risk_score so RiskGauge can render both. */
  riskScore: number;
}

/**
 * v0 heuristic, NOT a trained or clinically validated model. The WAVELENGTH
 * PAIRS are literature-anchored (see computeLiteratureRatios above); the
 * mapping from their values to a 0-1 riskScore is still an uncalibrated
 * placeholder — the literature is explicit that no reliable absolute/
 * contrast threshold table exists to calibrate against. Treat riskScore as
 * a demo signal, not a number to quote as accuracy in front of a jury — see
 * the /capture skin-detection.ts precedent for why an uncalibrated
 * confident-looking number is worse than an honest "needs calibration" label.
 */
export function computeSpectralIndices(lesion: SpectralChannels, reference: SpectralChannels): SpectralIndices {
  // Guard: if either reading has zero or empty counts, return zero risk
  const lesionSum = CHANNEL_KEYS.reduce((sum, k) => sum + (lesion[k] || 0), 0);
  const refSum = CHANNEL_KEYS.reduce((sum, k) => sum + (reference[k] || 0), 0);
  if (lesionSum <= 0 || refSum <= 0) {
    return { erythemaIndex: 0, melaninIndex: 0, riskScore: 0 };
  }

  const ratios = computeLiteratureRatios(computeContrast(lesion, reference));
  const erythemaIndex = ratios.r540_650;
  const melaninIndex = ratios.r650_950;

  // combined > 0 indicates excess erythema or melanin in the lesion relative to healthy skin.
  // When combined <= 0 (lesion is equal to or lighter/less vascular than normal skin),
  // riskScore is 0 (NOT 0.5, which was a mathematical artifact of (tanh(0)+1)/2).
  const combined = 0.5 * erythemaIndex + 0.5 * melaninIndex;
  const riskScore = combined <= 0 ? 0 : Math.min(1, Math.tanh(combined));

  return { erythemaIndex, melaninIndex, riskScore };
}
