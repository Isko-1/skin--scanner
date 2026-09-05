// DEPRECATED — больше не используется, можно удалить папку app/api/active-mole вручную.
// См. components/active-mole-register.tsx для объяснения почему (globalThis
// ненадёжен между serverless-инстансами на Vercel) и чем заменено (mole_id
// шлётся явно с устройства, см. skin-scanner-device/PLAN.md).
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Deprecated — mole_id теперь отправляется устройством напрямую" }, { status: 410 });
}
