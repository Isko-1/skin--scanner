import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { classifyImage } from "@/lib/classifier";

export async function POST(req: NextRequest) {
  const { mole_id, image_path, sharpness_score } = await req.json();

  if (!mole_id || !image_path || sharpness_score == null) {
    return NextResponse.json({ error: "mole_id, image_path и sharpness_score обязательны" }, { status: 400 });
  }

  const db = supabaseAdmin();

  // Confirm the mole exists before doing the (comparatively expensive) inference call.
  const { data: mole, error: moleError } = await db.from("moles").select("id").eq("id", mole_id).single();
  if (moleError || !mole) {
    return NextResponse.json({ error: "Родинка не найдена" }, { status: 404 });
  }

  const { data: signed, error: signError } = await db.storage
    .from("mole-photos")
    .createSignedUrl(image_path, 60);
  if (signError || !signed) {
    return NextResponse.json({ error: "Не удалось прочитать фото из storage" }, { status: 500 });
  }

  let classProbs: Record<string, number>;
  try {
    classProbs = await classifyImage(signed.signedUrl);
  } catch (e) {
    return NextResponse.json({ error: `Классификация не удалась: ${(e as Error).message}` }, { status: 502 });
  }

  const riskScore = classProbs.malignant ?? Math.max(...Object.values(classProbs));

  const { data: analysis, error: insertError } = await db
    .from("photo_analyses")
    .insert({
      mole_id,
      image_path,
      sharpness_score,
      class_probs: classProbs,
      risk_score: riskScore,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(analysis);
}
