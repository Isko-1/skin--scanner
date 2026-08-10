import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RiskGauge, riskLevel } from "@/components/risk-gauge";

// Was: supabaseAdmin (service key) fetching by id with no ownership check —
// anyone who knew or guessed a mole UUID could open another person's mole
// history. The session client + "own moles" RLS policy makes this return
// null for moles you don't own, so we can 404 instead of leaking them.
export default async function MoleHistoryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: mole } = await supabase.from("moles").select("*").eq("id", params.id).single();

  if (!mole) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 bg-[var(--color-background)] px-4 text-center text-[var(--color-foreground)]">
        <p className="text-sm font-medium text-[var(--color-foreground)]">Родинка не найдена</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">Она не существует или принадлежит другому аккаунту.</p>
        <Link href="/" className="mt-2 text-sm text-[var(--color-accent)] underline">
          На главную
        </Link>
      </main>
    );
  }

  const { data: analyses } = await supabase
    .from("photo_analyses")
    .select("*")
    .eq("mole_id", params.id)
    .order("created_at", { ascending: false });

  // Fetch all signed thumbnail URLs in parallel — was a sequential await-in-loop,
  // which meant N round-trips stacked serially before the page could render.
  const thumbEntries = await Promise.all(
    (analyses ?? []).map(async (a) => {
      const { data } = await supabase.storage.from("mole-photos").createSignedUrl(a.image_path, 3600);
      return [a.id, data?.signedUrl] as const;
    })
  );
  const thumbs = new Map(thumbEntries);

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[var(--color-background)] px-4 py-6 text-[var(--color-foreground)]">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{mole.label}</h1>
          {mole.body_location && <p className="text-sm text-[var(--color-muted-foreground)]">{mole.body_location}</p>}
        </div>
        <Link
          href={`/capture?mole_id=${params.id}`}
          className="flex min-h-11 items-center rounded-xl bg-[var(--color-accent)] px-5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95"
        >
          Новый скан
        </Link>
      </header>

      {!analyses?.length && (
        <div className="panel mt-16 flex flex-col items-center gap-2 px-6 py-10 text-center">
          <p className="text-sm font-medium text-[var(--color-foreground)]">Пока нет сканов</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">Сделайте первый скан, чтобы начать отслеживать эту родинку.</p>
        </div>
      )}

      <ul className="space-y-3">
        {analyses?.map((a) => {
          const { label } = riskLevel(a.risk_score);
          const thumb = thumbs.get(a.id);
          return (
            <li key={a.id} className="panel flex items-center gap-3 p-3">
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
                <p className="text-sm text-[var(--color-foreground)]">{new Date(a.created_at).toLocaleString("ru-RU")}</p>
                <p className="text-xs text-[var(--color-muted-foreground)]">Резкость: {Math.round(a.sharpness_score)}</p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <RiskGauge score={a.risk_score} />
                <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">{label}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
