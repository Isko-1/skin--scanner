// Classic RGB skin-tone heuristic (the rule used in most OpenCV skin-detection
// tutorials) — cheap enough to run client-side, same spirit as
// lib/sharpness.ts: catch an obviously-wrong photo before spending an HF
// inference call on it, not replace the model.
//
// Important limitation: this is NOT a mole detector. A photo of a bare arm
// or hand with no lesion on it still reads as "skin" — it only catches gross
// mismatches (a wall, floor, sky, fabric, etc.) where the classifier would
// otherwise silently force a false low-risk verdict onto content that was
// never skin to begin with. It also isn't equally reliable across all skin
// tones and lighting conditions, which is why app/capture/page.tsx only uses
// it as a soft pre-submit warning — the hard gate lives server-side in
// app/api/classify/route.ts, which imports SKIN_RATIO_MIN from here too so
// both sides agree on one threshold.
export const SKIN_RATIO_MIN = 0.15;

function isSkinPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r > 95 && g > 40 && b > 20 && max - min > 15 && Math.abs(r - g) > 15 && r > g && r > b;
}

/** Fraction (0-1) of sampled pixels that look like skin tone, sampled from
 *  the central square the on-screen alignment circle points at — the frame
 *  edges are expected to be background, only the middle should be skin. */
export function scoreSkinToneRatio(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d")!;
  const size = Math.min(canvas.width, canvas.height) * 0.4; // matches the guide circle's rough footprint
  const x = (canvas.width - size) / 2;
  const y = (canvas.height - size) / 2;
  const { data } = ctx.getImageData(x, y, size, size);

  let skinCount = 0;
  let total = 0;
  const stride = 16; // every 4th pixel (4 channels each) — plenty for a ratio, much faster than every pixel
  for (let i = 0; i < data.length; i += stride) {
    if (isSkinPixel(data[i], data[i + 1], data[i + 2])) skinCount++;
    total++;
  }
  return total ? skinCount / total : 0;
}
