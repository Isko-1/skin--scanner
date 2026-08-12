import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CHANNEL_KEYS, isSpectralChannels, computeSpectralIndices } from "@/lib/spectral";
import { matchPattern } from "@/lib/spectral-patterns";

// Called directly by the ESP32 probe over WiFi (STA mode, its own internet
// connection) — NOT by the browser. There's no Supabase Auth session to
// check here the way app/api/classify/route.ts does, because the device
// never logs in. Protected instead by a shared secret the firmware sends in
// the Authorization header. This means anyone with the secret can write a
// reading onto any mole_id — acceptable for a hackathon demo device, not for
// a real multi-user product; tighten this before this goes further than a
// jury demo (e.g. pair the probe to one account via a short-lived setup
// token instead of one static secret shared by every device).
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.SPECTRAL_DEVICE_SECRET}`;
  if (!process.env.SPECTRAL_DEVICE_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  let { mole_id, photo_analysis_id } = body;

  // Динамический пейринг: если mole_id не указан или равен дефолтному шаблону,
  // подставляем последнюю открытую пользователем родинку из активной сессии
  if (!mole_id || mole_id === "REPLACE_WITH_A_MOLE_UUID") {
    const activeStore = (globalThis as any).__activeMoleStore;
    if (activeStore?.moleId) {
      mole_id = activeStore.moleId;
    }
  }

  if (!mole_id || !isSpectralChannels(body.channels)) {
    return NextResponse.json(
      { error: `mole_id и channels (${CHANNEL_KEYS.join(", ")}) обязательны` },
      { status: 400 }
    );
  }

  const db = supabaseAdmin;

  const { data: mole, error: moleError } = await db.from("moles").select("id").eq("id", mole_id).single();
  if (moleError || !mole) {
    return NextResponse.json({ error: "Родинка не найдена" }, { status: 404 });
  }

  const { riskScore } = computeSpectralIndices(body.channels);
  const { best: patternMatch } = matchPattern(body.channels);

  const { data: reading, error: insertError } = await db
    .from("spectral_readings")
    .insert({
      mole_id,
      photo_analysis_id: photo_analysis_id ?? null,
      channels: body.channels,
      risk_score: riskScore,
      pattern_match: patternMatch,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(reading);
}
