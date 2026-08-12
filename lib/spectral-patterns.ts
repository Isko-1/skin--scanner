// "Pattern library" comparison for spectral readings — the piece from the
// original pitch ("сравнит по паттернам, похоже/не похоже"), separate from
// computeSpectralIndices() in lib/spectral.ts (that stays as the numeric
// 0-1 risk_score used everywhere RiskGauge is; this adds a qualitative
// "closest known pattern" verdict alongside it, not instead of it).
//
// HONESTY NOTE, read before touching PATTERN_LIBRARY below: there is no real
// clinical reference dataset behind these entries. Nobody has scanned a
// confirmed-benign or confirmed-malignant lesion with this exact probe yet —
// the hardware hasn't even arrived at time of writing. The two profiles here
// are hand-authored from the *direction* of the same diffuse-reflectance-
// spectroscopy literature computeSpectralIndices() already cites (elevated
// red/NIR absorption ~ more melanin, elevated green/orange dip ~ more
// erythema), not from measured data. Treat this as scaffolding to demo the
// comparison mechanism, not as a validated pattern match — replace
// PATTERN_LIBRARY's channel vectors with real averaged readings the moment
// you have even a handful of real reference scans (see PATTERN_LIBRARY
// comments below for exactly what to swap in).

import { CHANNEL_KEYS, type SpectralChannels } from "./spectral";

export interface SpectralPattern {
  id: string;
  label: string;
  category: "benign" | "concerning";
  description: string;
  /** Reference channel *shape*, not absolute counts — compared by cosine
   *  similarity (see matchPattern), so only relative proportions between
   *  channels matter. Absolute magnitude varies with distance/gain/skin
   *  tone regardless of what's being measured, so comparing raw counts
   *  directly would be comparing exposure, not tissue signal. */
  channels: SpectralChannels;
}

export const PATTERN_LIBRARY: SpectralPattern[] = [
  {
    id: "typical-benign",
    label: "Типичная доброкачественная родинка",
    category: "benign",
    description: "Ровный профиль отражения без выраженных провалов в оранжевом/красном диапазоне.",
    // Placeholder shape: roughly flat across visible channels, no strong
    // red/NIR dip. Replace with the averaged channel vector from several
    // real scans of moles a dermatologist has already confirmed benign.
    channels: { f1: 200, f2: 260, f3: 320, f4: 380, f5: 420, f6: 400, f7: 370, f8: 340, clear: 4095, nir: 300 },
  },
  {
    id: "concerning-pattern",
    label: "Паттерн, требующий внимания врача",
    category: "concerning",
    description: "Выраженное поглощение в красном/ближнем ИК и провал в жёлто-оранжевом — по направлению совпадает с тем, что литература по диффузной рефлектометрии связывает с повышенным меланином/эритемой.",
    // Placeholder shape: same literature-informed direction as the
    // erythemaIndex/melaninIndex formulas in lib/spectral.ts — deliberately
    // NOT derived from real melanoma reference data (none exists here).
    channels: { f1: 180, f2: 220, f3: 260, f4: 300, f5: 260, f6: 200, f7: 150, f8: 110, clear: 4095, nir: 420 },
  },
];

function normalize(channels: SpectralChannels): number[] {
  // Unit-vector normalize so comparison is about *shape* (relative
  // proportions between channels), not absolute brightness — two readings
  // of the same tissue at different distances/gain settings should still
  // match, since only the ratios between channels carry the signal.
  const vec = CHANNEL_KEYS.map((k) => channels[k]);
  const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / magnitude);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  // Both vectors are already unit-normalized, so dot product IS the cosine
  // similarity directly — no need to divide by magnitudes again.
  return dot;
}

export interface PatternMatch {
  patternId: string;
  label: string;
  category: SpectralPattern["category"];
  /** 0-1, how close the shape is to this pattern — not a probability. */
  similarity: number;
}

export interface PatternMatchResult {
  best: PatternMatch;
  all: PatternMatch[];
}

/** Compares a reading's channel shape against every entry in PATTERN_LIBRARY
 *  and returns the closest match plus the full ranked list (for showing
 *  "how close to each" rather than just a single verdict, if useful later). */
export function matchPattern(channels: SpectralChannels): PatternMatchResult {
  const readingVec = normalize(channels);

  const all: PatternMatch[] = PATTERN_LIBRARY.map((pattern) => ({
    patternId: pattern.id,
    label: pattern.label,
    category: pattern.category,
    similarity: cosineSimilarity(readingVec, normalize(pattern.channels)),
  })).sort((a, b) => b.similarity - a.similarity);

  return { best: all[0], all };
}
