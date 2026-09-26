import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { setActiveProbeSession, resolveActiveProbeMoleId } from "@/lib/probe-session";

export async function POST(req: NextRequest) {
  try {
    const { mole_id } = await req.json();

    if (!mole_id) {
      return NextResponse.json({ error: "mole_id обязателен" }, { status: 400 });
    }

    const authClient = createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    await setActiveProbeSession(mole_id, user?.id ?? null);

    return NextResponse.json({
      success: true,
      active_mole_id: mole_id,
      expires_in_minutes: 10,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const activeMoleId = await resolveActiveProbeMoleId();
  return NextResponse.json({
    active_mole_id: activeMoleId,
    paired: Boolean(activeMoleId),
  });
}
