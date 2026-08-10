import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabase/server";
import { classifyImage } from "@/lib/classifier";

export async function POST(req: NextRequest) {
  const { mole_id, image_path, sharpness_score } = await req.json();

  if (!mole_id || !image_path || sharpness_score == null) {
    return NextResponse.json({ error: "mole_id, image_path и sharpness_score обязательны" }, { status: 400 });
  }

  // This route uses the service key below (to write class_probs/risk_score
  // for any mole_id it's given), which bypasses the "own photo_analyses" RLS
  // policy entirely — so the ownership check has to happen here explicitly,
  // or a logged-in user could POST an analysis onto someone else's mole_id.
  const authClient = createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const db = supabaseAdmin;

  // Confirm the mole exists (and belongs to this user) before doing the
  // (comparatively expensive) inference call.
  const { data: mole, error: moleError } = await db.from("moles").select("id, owner_id").eq("id", mole_id).single();
  if (moleError || !mole) {
    return NextResponse.json({ error: "Родинка не найдена" }, { status: 404 });
  }
  if (mole.owner_id !== user.id) {
    return NextResponse.json({ error: "Родинка принадлежит другому аккаунту" }, { status: 403 });
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
