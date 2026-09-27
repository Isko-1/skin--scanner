import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CHANNEL_KEYS, isSpectralChannels, computeSpectralIndices } from "@/lib/spectral";
import { matchPattern } from "@/lib/spectral-patterns";
import { resolveActiveProbeMoleId } from "@/lib/probe-session";

// Called directly by the ESP32 probe over WiFi (STA mode, its own internet
// connection) — NOT by the browser. There's no Supabase Auth session to
// check here the way app/api/classify/route.ts does, because the device
// never logs in. Protected instead by a shared secret the firmware sends in
// the Authorization header.
//
// Dynamic Pairing: if the probe sends "auto" or omits mole_id, the route
// dynamically resolves the mole currently opened by the user on the website.
const PAIRING_WINDOW_MINUTES = 5;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.SPECTRAL_DEVICE_SECRET}`;
  if (!process.env.SPECTRAL_DEVICE_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { mole_id, photo_analysis_id, reading_type } = body;

  let targetMoleId = mole_id;
  if (!targetMoleId || targetMoleId === "auto" || targetMoleId === "REPLACE_WITH_REAL_MOLE_UUID") {
    targetMoleId = await resolveActiveProbeMoleId();
  }

  if (!targetMoleId || !isSpectralChannels(body.channels)) {
    return NextResponse.json(
      { error: `Не удалось определить активную родинку или channels (${CHANNEL_KEYS.join(", ")}) некорректны. Откройте страницу родинки на сайте.` },
      { status: 400 }
    );
  }
  if (reading_type !== "lesion" && reading_type !== "reference") {
    return NextResponse.json({ error: 'reading_type должен быть "lesion" или "reference"' }, { status: 400 });
  }

  const db = supabaseAdmin;

  const { data: mole, error: moleError } = await db.from("moles").select("id").eq("id", targetMoleId).single();
  if (moleError || !mole) {
    return NextResponse.json({ error: "Родинка не найдена" }, { status: 404 });
  }

  const oppositeType = reading_type === "lesion" ? "reference" : "lesion";
  const windowStart = new Date(Date.now() - PAIRING_WINDOW_MINUTES * 60_000).toISOString();

  const { data: match } = await db
    .from("spectral_readings")
    .select("id, channels, reading_type")
    .eq("mole_id", targetMoleId)
    .eq("reading_type", oppositeType)
    .is("paired_with", null)
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Only ever compute/store risk_score+pattern_match on the 'lesion' side —
  // 'reference' is a baseline reading, it doesn't have its own risk.
  let lesionRiskScore: number | null = null;
  let lesionPatternMatch = null;
  if (match) {
    const lesionChannels = reading_type === "lesion" ? body.channels : match.channels;
    const referenceChannels = reading_type === "reference" ? body.channels : match.channels;
    lesionRiskScore = computeSpectralIndices(lesionChannels, referenceChannels).riskScore;
    lesionPatternMatch = matchPattern(lesionChannels, referenceChannels).best;
  }

  const { data: reading, error: insertError } = await db
    .from("spectral_readings")
    .insert({
      mole_id: targetMoleId,
      photo_analysis_id: photo_analysis_id ?? null,
      reading_type,
      channels: body.channels,
      paired_with: match?.id ?? null,
      risk_score: reading_type === "lesion" ? lesionRiskScore : null,
      pattern_match: reading_type === "lesion" ? lesionPatternMatch : null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Best-effort — the reading having gone through is what matters; don't
  // fail the whole request over the status-tab update. next_reading_type
  // comes from the firmware (it knows what it just toggled to — see
  // pen-probe.ino); fall back to flipping reading_type here if an older
  // firmware build doesn't send it yet.
  const nextReadingType =
    body.next_reading_type === "lesion" || body.next_reading_type === "reference"
      ? body.next_reading_type
      : reading_type === "lesion"
        ? "reference"
        : "lesion";
  await db
    .from("devices")
    .update({
      last_seen_at: new Date().toISOString(),
      last_reading_at: new Date().toISOString(),
      next_reading_type: nextReadingType,
    })
    .eq("id", "pen-probe");

  // Found a pending pair — link it back to the reading we just inserted,
  // and if THAT pending row was the 'lesion' side, this is also the moment
  // its risk_score/pattern_match get filled in (it was sitting at null
  // since it was inserted before its reference existed).
  if (match) {
    await db
      .from("spectral_readings")
      .update({
        paired_with: reading.id,
        ...(match.reading_type === "lesion"
          ? { risk_score: lesionRiskScore, pattern_match: lesionPatternMatch }
          : {}),
      })
      .eq("id", match.id);
  }

  return NextResponse.json(reading);
}
