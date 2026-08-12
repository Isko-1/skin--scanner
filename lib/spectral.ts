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

function log10Ratio(a: number, b: number): number {
  // Raw ADC counts, never negative, but can be 0 in a dark reading — floor
  // at 1 so this can't divide by zero or take log10 of 0.
  return Math.log10(Math.max(a, 1) / Math.max(b, 1));
}

export interface SpectralIndices {
  /** Approximates blood/erythema signal from the green-vs-orange reflectance dip. */
  erythemaIndex: number;
  /** Approximates melanin signal from red-vs-near-infrared reflectance. */
  melaninIndex: number;
  /** 0-1, same scale as photo_analyses.risk_score so RiskGauge can render both. */
  riskScore: number;
}

/**
 * v0 heuristic, NOT a trained or clinically validated model — adapted from
 * the general diffuse-reflectance-spectroscopy literature (narrowband
 * erythema/melanin indices) to whichever AS7341 channels sit closest to the
 * wavelengths those formulas call for. Treat riskScore as a demo signal to
 * calibrate against real reference readings, not a number to quote as
 * accuracy in front of a jury — see the /capture skin-detection.ts precedent
 * for why an uncalibrated confident-looking number is worse than an honest
 * "needs calibration" label.
 */
export function computeSpectralIndices(channels: SpectralChannels): SpectralIndices {
  const erythemaIndex = log10Ratio(channels.f5, channels.f7); // green (555nm) vs orange (630nm)
  const melaninIndex = log10Ratio(channels.f8, channels.nir); // red (680nm) vs NIR (~910nm)

  // Folds both indices into 0-1 so this can share RiskGauge with
  // photo_analyses.risk_score. tanh keeps outliers from ever exceeding the
  // gauge's [0,1] range instead of clamping/discarding them.
  const combined = 0.5 * erythemaIndex + 0.5 * melaninIndex;
  const riskScore = (Math.tanh(combined) + 1) / 2;

  return { erythemaIndex, melaninIndex, riskScore };
}
