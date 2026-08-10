import Image from "next/image";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { RiskGauge, riskLevel } from "@/components/risk-gauge";

export default async function MoleHistoryPage({ params }: { params: { id: string } }) {
  const db = supabaseAdmin;

  const { data: mole } = await db.from("moles").select("*").eq("id", params.id).single();
  const { data: analyses } = await db
    .from("photo_analyses")
    .select("*")
    .eq("mole_id", params.id)
    .order("created_at", { ascending: false });

  // Fetch all signed thumbnail URLs in parallel — was a sequential await-in-loop,
  // which meant N round-trips stacked serially before the page could render.
  const thumbEntries = await Promise.all(
    (analyses ?? []).map(async (a) => {
      const { data } = await db.storage.from("mole-photos").createSignedUrl(a.image_path, 3600);
      return [a.id, data?.signedUrl] as const;
    })
  );
  const thumbs = new Map(thumbEntries);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[var(--color-background)] px-4 py-6 text-[var(--color-foreground)]">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{mole?.label ?? "Родинка"}</h1>
          {mole?.body_location && <p className="text-sm text-slate-500">{mole.body_location}</p>}
        </div>
        <Link
          href={`/capture?mole_id=${params.id}`}
          className="flex min-h-11 items-center rounded-lg bg-[var(--color-accent)] px-5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95"
        >
          Новый скан
        </Link>
      </header>

      {!analyses?.length && (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-medium text-slate-600">Пока нет сканов</p>
          <p className="text-sm text-slate-400">Сделайте первый скан, чтобы начать отслеживать эту родинку.</p>
        </div>
      )}

      <ul className="space-y-3">
        {analyses?.map((a) => {
          const { label } = riskLevel(a.risk_score);
          const thumb = thumbs.get(a.id);
          return (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-sm"
            >
              {thumb && (
                <Image
                  src={thumb}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-lg object-cover"
                  unoptimized
                />
              )}
              <div className="flex-1">
                <p className="text-sm text-slate-700">{new Date(a.created_at).toLocaleString("ru-RU")}</p>
                <p className="text-xs text-slate-400">Резкость: {Math.round(a.sharpness_score)}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RiskGauge score={a.risk_score} />
                <span className="text-[11px] font-medium text-slate-500">{label}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
