import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// Called by the ESP32 probe every ~10s regardless of whether the button is
// pressed (see HEARTBEAT_INTERVAL_MS in firmware/pen-probe/pen-probe.ino) —
// this is what lets the "Устройство" tab know the probe is alive even
// between readings. Same shared-secret auth as /api/spectral, since this is
// also device-to-server with no user session.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.SPECTRAL_DEVICE_SECRET}`;
  if (!process.env.SPECTRAL_DEVICE_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rssi = typeof body.rssi === "number" ? body.rssi : null;
  const uptimeMs = typeof body.uptime_ms === "number" ? body.uptime_ms : null;

  const { error } = await supabaseAdmin
    .from("devices")
    .update({ last_seen_at: new Date().toISOString(), rssi, uptime_ms: uptimeMs })
    .eq("id", "pen-probe");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
