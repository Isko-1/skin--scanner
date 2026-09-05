import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { CHANNEL_KEYS, isSpectralChannels, computeSpectralIndices } from "@/lib/spectral";
import { matchPattern } from "@/lib/spectral-patterns";

// Browser-triggered manual spectral reading — called from the site's own UI
// (SpectralButtons component on the mole detail page) when the user presses
// «Замер родинки» or «Замер референса» to log a manual reading on behalf of
// a connected device.
//
// Auth: Supabase session cookie (same as every other page route), not the
// device Bearer secret. This means only the logged-in owner of the mole can
// submit a manual reading — the firmware route (/api/spectral) keeps its own
// device-secret auth unchanged.
//
// Pairing logic is IDENTICAL to /api/spectral/route.ts — same 5-minute
// window, same UPDATE-back to fill risk_score on whichever side arrived first.
// Extracted to a shared helper to stay DRY once you actually have two callers.

const PAIRING_WINDOW_MINUTES = 5;

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  // ── Body validation ───────────────────────────────────────────────────────
  const body = await req.json();
  const { mole_id, photo_analysis_id, reading_type, channels } = body;

  if (!mole_id || !isSpectralChannels(channels)) {
    return NextResponse.json(
      { error: `mole_id и channels (${CHANNEL_KEYS.join(", ")}) обязательны` },
      { status: 400 }
    );
  }
  if (reading_type !== "lesion" && reading_type !== "reference") {
    return NextResponse.json(
      { error: 'reading_type должен быть "lesion" или "reference"' },
      { status: 400 }
    );
  }

  // ── Ownership check ───────────────────────────────────────────────────────
  // RLS on the session client already enforces this; the explicit check gives
  // a clear 403 instead of a 404/empty-result that would confuse the client.
  const { data: mole } = await supabase
    .from("moles")
    .select("id")
    .eq("id", mole_id)
    .single();

  if (!mole) {
    return NextResponse.json(
      { error: "Родинка не найдена или принадлежит другому аккаунту" },
      { status: 403 }
    );
  }

  // ── Pairing (same logic as /api/spectral) ─────────────────────────────────
  const db = supabaseAdmin;
  const oppositeType = reading_type === "lesion" ? "reference" : "lesion";
  const windowStart = new Date(
    Date.now() - PAIRING_WINDOW_MINUTES * 60_000
  ).toISOString();

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

  let lesionRiskScore: number | null = null;
  let lesionPatternMatch = null;
  if (match) {
    const lesionChannels = reading_type === "lesion" ? channels : match.channels;
    const referenceChannels =
      reading_type === "reference" ? channels : match.channels;
    lesionRiskScore = computeSpectralIndices(
      lesionChannels,
      referenceChannels
    ).riskScore;
    lesionPatternMatch = matchPattern(lesionChannels, referenceChannels).best;
  }

  // ── Insert ────────────────────────────────────────────────────────────────
  const { data: reading, error: insertError } = await db
    .from("spectral_readings")
    .insert({
      mole_id,
      photo_analysis_id: photo_analysis_id ?? null,
      reading_type,
      channels,
      paired_with: match?.id ?? null,
      risk_score: reading_type === "lesion" ? lesionRiskScore : null,
      pattern_match: reading_type === "lesion" ? lesionPatternMatch : null,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // ── Back-link the pair ────────────────────────────────────────────────────
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
