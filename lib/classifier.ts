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

// Model card label names vary ("mel", "malignant", "MEL") — normalize to what
// the rest of the app expects (`risk_score` reads probs.malignant).
function normalizeLabel(label: string): string {
  const l = label.toLowerCase();
  if (["mel", "malignant", "melanoma", "bcc", "akiec"].includes(l)) return "malignant";
  if (["nv", "benign", "bkl", "df", "vasc"].includes(l)) return "benign";
  return l;
}
