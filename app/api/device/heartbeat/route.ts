import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Called by the ESP32 probe every ~10s regardless of whether the button is
// pressed (see HEARTBEAT_INTERVAL_MS in firmware) — this is what lets the site
// know the probe is alive even between readings. Same shared-secret auth as
// /api/spectral, since this is also device-to-server with no user session.
//
// Body fields (all optional for backwards-compat):
//   rssi       — WiFi.RSSI() in dBm
//   uptime_ms  — millis() since last boot
//   status     — current device state: "idle" | "sending" | "cooldown" | "wifi_reset"
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.SPECTRAL_DEVICE_SECRET}`;
  if (!process.env.SPECTRAL_DEVICE_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rssi = typeof body.rssi === "number" ? body.rssi : null;
  const uptimeMs = typeof body.uptime_ms === "number" ? body.uptime_ms : null;
  const VALID_STATUSES = ["idle", "sending", "cooldown", "wifi_reset"] as const;
  const status = VALID_STATUSES.includes(body.status) ? body.status : "idle";

  const { error } = await supabaseAdmin
    .from("devices")
    .update({
      last_seen_at: new Date().toISOString(),
      rssi,
      uptime_ms: uptimeMs,
      status,
    })
    .eq("id", "pen-probe");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

