// "Pattern library" comparison for spectral readings — the piece from the
// original pitch ("сравнит по паттернам, похоже/не похоже"), separate from
// computeSpectralIndices() in lib/spectral.ts (that stays as the numeric
// 0-1 risk_score used everywhere RiskGauge is; this adds a qualitative
// "closest known pattern" verdict alongside it, not instead of it).
//
// Rewritten after reviewing the diffuse-reflectance-spectroscopy literature:
// this now compares the SAME six literature-anchored wavelength-ratio
// features computeSpectralIndices() is built from (see
// computeLiteratureRatios in lib/spectral.ts) — not a raw 10-channel shape
// like the first version. Two things changed for the better, and one
// limitation did NOT change:
//   - WHICH channels matter is now grounded in cited studies, not guessed.
//   - Comparison is contrast-based (lesion vs adjacent normal skin), fixing
//     the skin-tone confounding the first version had.
//   - What did NOT change: nobody has scanned a confirmed-benign or
//     confirmed-malignant lesion with this exact probe yet, and the cited
//     literature itself found no reliable table of absolute/contrast
//     threshold values (only which wavelength ratios are informative).
//     PATTERN_LIBRARY's two entries are still illustrative placeholders —
//     replace them the moment you have even a handful of real paired
//     (lesion + reference) reference scans.

import { computeContrast, computeLiteratureRatios, type LiteratureRatios, type SpectralChannels } from "./spectral";

const RATIO_KEYS = ["r540_650", "r540_950", "r650_950", "r450_590", "r450_950", "r590_950"] as const;

export interface SpectralPattern {
  id: string;
  label: string;
  category: "benign" | "concerning";
  description: string;
  /** Reference values for the same six literature-anchored ratios computed
   *  by computeLiteratureRatios() — comparable directly, no further
   *  normalization needed since both sides are already lesion/reference
   *  contrasts. */
  ratios: LiteratureRatios;
}

export const PATTERN_LIBRARY: SpectralPattern[] = [
  {
    id: "typical-benign",
    label: "Типичная доброкачественная родинка",
    category: "benign",
    description: "Небольшой контраст с окружающей кожей по всем шести соотношениям — родинка спектрально похожа на фон.",
    // Placeholder: near-zero across the board (lesion ~ reference). Replace
    // with the averaged ratio vector from several real paired scans of
    // moles a dermatologist has already confirmed benign.
    ratios: { r540_650: 0.05, r540_950: 0.03, r650_950: -0.02, r450_590: 0.04, r450_950: 0.02, r590_950: -0.02 },
  },
  {
    id: "concerning-pattern",
    label: "Паттерн, требующий внимания врача",
    category: "concerning",
    description: "Выраженный контраст в парах 540/650 и 650/950 — направление совпадает с меланома-vs-невус критерием и ML-отбором признаков из цитируемой литературы (не с измеренными значениями, см. комментарий выше).",
    // Placeholder: elevated |r540_650| and |r650_950| specifically, since
    // those are the two ratios the cited melanoma-vs-common-nevus criterion
    // and wavelength-selection study both flag as informative. Still NOT
    // derived from real melanoma reference data — none exists here.
    ratios: { r540_650: 0.35, r540_950: 0.12, r650_950: 0.3, r450_590: 0.1, r450_950: 0.08, r590_950: 0.06 },
  },
];

function toVector(ratios: LiteratureRatios): number[] {
  return RATIO_KEYS.map((k) => ratios[k]);
}

export interface PatternMatch {
  patternId: string;
  label: string;
  category: SpectralPattern["category"];
  /** 0-1, how close the reading's ratios are to this pattern — not a probability. */
  similarity: number;
}

export interface PatternMatchResult {
  best: PatternMatch;
  all: PatternMatch[];
}

/** Compares a lesion+reference reading pair against every entry in
 *  PATTERN_LIBRARY and returns the closest match plus the full ranked list.
 *  Uses Euclidean distance, not cosine similarity — these are small, signed
 *  log-ratio features that can legitimately sit near zero (a lesion that's
 *  spectrally unremarkable vs its surrounding skin), and cosine similarity
 *  is unstable/meaningless for near-zero vectors since it only compares
 *  direction, not magnitude. Distance in this feature space is the
 *  meaningful notion of "close to this pattern" here. */
export function matchPattern(lesion: SpectralChannels, reference: SpectralChannels): PatternMatchResult {
  const readingVec = toVector(computeLiteratureRatios(computeContrast(lesion, reference)));

  const all: PatternMatch[] = PATTERN_LIBRARY.map((pattern) => {
    const patternVec = toVector(pattern.ratios);
    const distance = Math.sqrt(readingVec.reduce((sum, v, i) => sum + (v - patternVec[i]) ** 2, 0));
    return {
      patternId: pattern.id,
      label: pattern.label,
      category: pattern.category,
      similarity: 1 / (1 + distance), // maps [0,inf) distance to (0,1] similarity
    };
  }).sort((a, b) => b.similarity - a.similarity);

  return { best: all[0], all };
}
