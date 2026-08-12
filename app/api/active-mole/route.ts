import { NextRequest, NextResponse } from "next/server";

// Глобальное хранилище текущей активной родинки для демо-пейринга
declare global {
  var __activeMoleStore: { moleId: string; updatedAt: number } | undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mole_id } = body;

    if (!mole_id) {
      return NextResponse.json({ error: "mole_id обязателен" }, { status: 400 });
    }

    globalThis.__activeMoleStore = {
      moleId: mole_id,
      updatedAt: Date.now(),
    };

    return NextResponse.json({ success: true, activeMoleId: mole_id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const store = globalThis.__activeMoleStore;
  return NextResponse.json({
    activeMoleId: store?.moleId ?? null,
    updatedAt: store?.updatedAt ?? null,
  });
}
