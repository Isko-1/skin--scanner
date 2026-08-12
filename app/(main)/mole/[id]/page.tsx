import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RiskGauge, riskLevel } from "@/components/risk-gauge";
import { ActiveMoleRegister } from "@/components/active-mole-register";
import { PdfReportButton } from "@/components/pdf-report-button";
import { SpectralLive } from "@/components/spectral-live";
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
      {/* Регистрируем открытую родинку как активную в сессии */}
      <ActiveMoleRegister moleId={params.id} />

      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{mole.label}</h1>
          {mole.body_location && <p className="text-sm text-[var(--color-muted-foreground)]">{mole.body_location}</p>}
        </div>
        <div className="flex items-center gap-2">
          <PdfReportButton moleLabel={mole.label} bodyLocation={mole.body_location} />
          <Link
            href={`/capture?mole_id=${params.id}`}
            className="flex min-h-11 items-center rounded-xl bg-[var(--color-accent)] px-5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95"
          >
            Новый скан
          </Link>
        </div>
      </header>

      <div className="mb-4">
        <SpectralLive moleId={params.id} />
      </div>

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

      {!!analyses?.length && (
        <p className="mt-4 flex items-start gap-1.5 text-xs text-[var(--color-muted-foreground)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
          Это автоматическая оценка, а не диагноз. Низкий risk score не отменяет очный осмотр у врача, особенно если родинка меняется, кровоточит или чешется.
        </p>
      )}
    </main>
  );
}
