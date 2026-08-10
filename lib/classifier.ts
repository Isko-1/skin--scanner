// Wraps a pretrained skin-lesion classifier. Don't train from scratch for the
// hackathon — pick pretrained HAM10000/ISIC weights on Hugging Face and point
// HF_MODEL_ID at them (search "skin cancer" or "HAM10000" on huggingface.co/models).
// Using HF's hosted Inference API means zero local model-serving code (ponytail rung 5).

const HF_MODEL_ID = process.env.HF_MODEL_ID; // e.g. "Anwarkh1/Skin_Cancer-Image_Classification"

export async function classifyImage(imageUrl: string): Promise<Record<string, number>> {
  if (!HF_MODEL_ID || !process.env.HF_TOKEN) {
    throw new Error("HF_MODEL_ID / HF_TOKEN не заданы — см. комментарий в lib/classifier.ts");
  }

  const imageRes = await fetch(imageUrl);
  const imageBlob = await imageRes.blob();

  const res = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL_ID}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": imageBlob.type || "application/octet-stream",
    },
    body: imageBlob,
  });

  if (!res.ok) {
    throw new Error(`HF Inference API вернул ${res.status}: ${await res.text()}`);
  }

  // HF image-classification models return [{ label, score }, ...]
  const predictions: { label: string; score: number }[] = await res.json();

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
