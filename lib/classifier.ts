// Wraps a pretrained skin-lesion classifier. Don't train from scratch for the
// hackathon — pick pretrained HAM10000/ISIC weights on Hugging Face and point
// HF_MODEL_ID at them (search "skin cancer" or "HAM10000" on huggingface.co/models).
// Using HF's hosted Inference API means zero local model-serving code (ponytail rung 5).

const HF_MODEL_ID = process.env.HF_MODEL_ID; // e.g. "Anwarkh1/Skin_Cancer-Image_Classification"

// api-inference.huggingface.co (the old "Serverless Inference API") was fully
// retired in HF's Inference Providers migration — every request there now
// returns 410 Gone with a redirect message, regardless of token/model. This
// isn't a rate limit or a fluke, it's every request, for every caller, until
// the URL is updated. router.huggingface.co/hf-inference is the replacement
// for single-model calls like this one; response shape for image models is
// unchanged ([{ label, score }, ...]), so nothing below this line needed to change.
const HF_INFERENCE_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL_ID}`;

// A model that hasn't been called recently gets unloaded from HF's shared
// compute and returns 503 while it cold-starts back up — this is normal and
// expected, not an error worth surfacing as "classification failed". A
// couple of short retries covers the typical few-second warm-up; if it's
// still 503 after that, something's actually wrong and the caller should hear
// about it.
const COLD_START_RETRIES = 2;
const COLD_START_DELAY_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function classifyImage(imageUrl: string): Promise<Record<string, number>> {
  if (!HF_MODEL_ID || !process.env.HF_TOKEN) {
    throw new Error("HF_MODEL_ID / HF_TOKEN не заданы — см. комментарий в lib/classifier.ts");
  }

  const imageRes = await fetch(imageUrl);
  const imageBlob = await imageRes.blob();

  let res: Response | null = null;
  for (let attempt = 0; attempt <= COLD_START_RETRIES; attempt++) {
    res = await fetch(HF_INFERENCE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": imageBlob.type || "application/octet-stream",
      },
      body: imageBlob,
    });

    if (res.status !== 503 || attempt === COLD_START_RETRIES) break;
    await sleep(COLD_START_DELAY_MS);
  }

  if (!res!.ok) {
    const detail = await res!.text();
    const message =
      res!.status === 503
        ? "Модель всё ещё загружается на стороне Hugging Face — попробуйте ещё раз через минуту."
        : `HF Inference API вернул ${res!.status}: ${detail}`;
    throw new Error(message);
  }

  // HF image-classification models return [{ label, score }, ...]
  const predictions: { label: string; score: number }[] = await res!.json();

  const probs: Record<string, number> = {};
  for (const { label, score } of predictions) probs[normalizeLabel(label)] = score;
  return probs;
}

// Model card label names vary by model — Anwarkh1/Skin_Cancer-Image_Classification
// (the default HF_MODEL_ID) returns full class names like "melanoma" and
// "basal cell carcinoma", not HAM10000-style abbreviations ("mel", "bcc").
// Substring match instead of an exact-value list so it survives label
// wording differences across models without silently mapping everything to benign.
const MALIGNANT_TERMS = ["melanoma", "basal cell carcinoma", "actinic keratos", "malignant"];
const BENIGN_TERMS = ["nevi", "benign", "vascular", "dermatofibroma", "keratosis-like"];

function normalizeLabel(label: string): string {
  const l = label.toLowerCase();
  if (MALIGNANT_TERMS.some((t) => l.includes(t))) return "malignant";
  if (BENIGN_TERMS.some((t) => l.includes(t))) return "benign";
  return l;
}
