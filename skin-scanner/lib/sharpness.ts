// Laplacian variance: a sharp image has high local contrast everywhere,
// so convolving with a Laplacian kernel and taking the variance of the
// result is a cheap, well-known blur detector. No dependency needed —
// it's ~20 lines of canvas pixel math (ponytail rung 6/7).

const LAPLACIAN_KERNEL = [0, 1, 0, 1, -4, 1, 0, 1, 0];

/** Returns a sharpness score (higher = sharper). Typical hand-held phone
 *  photos of a small subject land ~50-300; below ~60 is usually visibly blurred,
 *  but recalibrate against your own test shots before relying on the cutoff. */
export function laplacianVariance(imageData: ImageData): number {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const lap: number[] = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += gray[(y + dy) * width + (x + dx)] * LAPLACIAN_KERNEL[k++];
        }
      }
      lap.push(sum);
    }
  }

  const mean = lap.reduce((a, b) => a + b, 0) / lap.length;
  return lap.reduce((a, v) => a + (v - mean) ** 2, 0) / lap.length;
}

/** Downscales before scoring — full-res phone photos make the O(n) convolution
 *  slow for no accuracy gain, sharpness is a low-frequency-enough signal. */
export function scoreCanvasSharpness(canvas: HTMLCanvasElement, maxDim = 400): number {
  const scale = Math.min(1, maxDim / Math.max(canvas.width, canvas.height));
  const w = Math.round(canvas.width * scale);
  const h = Math.round(canvas.height * scale);

  const scaled = document.createElement("canvas");
  scaled.width = w;
  scaled.height = h;
  const ctx = scaled.getContext("2d")!;
  ctx.drawImage(canvas, 0, 0, w, h);

  return laplacianVariance(ctx.getImageData(0, 0, w, h));
}
