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
//
// Lesion + reference pairing: per the diffuse-reflectance-spectroscopy
// literature, a lesion reading on its own confounds skin tone with lesion
// biology — the probe now sends TWO separate POSTs per session (one with
// the tip on the mole, one on adjacent normal skin), distinguished by
// reading_type. Whichever arrives second finds its pending pair (same
// mole_id, opposite type, unpaired, within PAIRING_WINDOW_MINUTES) and
// that's when risk_score/pattern_match actually get computed — a lone
// reading just sits there with both null until (if ever) its pair shows up.
const PAIRING_WINDOW_MINUTES = 5;

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.SPECTRAL_DEVICE_SECRET}`;
  if (!process.env.SPECTRAL_DEVICE_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { mole_id, photo_analysis_id, reading_type } = body;

  if (!mole_id || !isSpectralChannels(body.channels)) {
    return NextResponse.json(
      { error: `mole_id и channels (${CHANNEL_KEYS.join(", ")}) обязательны` },
      { status: 400 }
    );
  }
  if (reading_type !== "lesion" && reading_type !== "reference") {
    return NextResponse.json({ error: 'reading_type должен быть "lesion" или "reference"' }, { status: 400 });
  }

  const db = supabaseAdmin;

  const { data: mole, error: moleError } = await db.from("moles").select("id").eq("id", mole_id).single();
  if (moleError || !mole) {
    return NextResponse.json({ error: "Родинка не найдена" }, { status: 404 });
  }

  const oppositeType = reading_type === "lesion" ? "reference" : "lesion";
  const windowStart = new Date(Date.now() - PAIRING_WINDOW_MINUTES * 60_000).toISOString();

  const { data: match } = await db
    .from("spectral_readings")
    .select("id, channels, reading_type")
    .eq("mole_id", mole_id)
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
      mole_id,
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
