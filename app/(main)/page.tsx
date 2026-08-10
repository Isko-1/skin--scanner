import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NumberTicker } from "@/components/ui/number-ticker";

// Was: supabaseAdmin with no owner_id filter at all — that's the service-role
// key, which bypasses RLS, so this page listed every user's moles to every
// visitor regardless of who was signed in (or not signed in). Switching to
// the session-bound client means the "own moles" RLS policy in
// supabase/schema.sql does the filtering, and it's also what makes
// per-user stats meaningful below.
export default async function HomePage() {
  const supabase = createClient();

  const { data: moles } = await supabase
    .from("moles")
    .select("id, label, body_location, photo_analyses(risk_score, created_at)")
    .order("created_at", { ascending: false });

  const scans = (moles ?? []).flatMap((m: any) => m.photo_analyses ?? []);
  const totalScans = scans.length;
  const avgRisk = totalScans ? scans.reduce((sum: number, a: any) => sum + Number(a.risk_score), 0) / totalScans : null;
  const maxRisk = totalScans ? Math.max(...scans.map((a: any) => Number(a.risk_score))) : null;

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[var(--color-background)] px-4 py-6 text-[var(--color-foreground)]">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Мои родинки</h1>
        <Link
          href="/mole/new"
          className="flex min-h-11 items-center rounded-xl bg-[var(--color-accent)] px-5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95"
        >
          + Добавить
        </Link>
      </header>

      {!!moles?.length && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <StatCard label="Родинок отслеживается" value={moles.length} />
          <StatCard label="Всего сканов" value={totalScans} />
          <StatCard label="Средний risk score" value={avgRisk} decimals={2} />
          <StatCard label="Макс. risk score" value={maxRisk} decimals={2} />
        </div>
      )}

      {!moles?.length && (
        <div className="panel mt-16 flex flex-col items-center gap-2 px-6 py-10 text-center">
          <EmptyStateIcon />
          <p className="text-sm font-medium text-[var(--color-foreground)]">Пока нет родинок</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">Добавьте первую, чтобы начать отслеживание.</p>
        </div>
      )}

      <ul className="space-y-2">
        {moles?.map((m: any) => {
          const analyses = m.photo_analyses ?? [];
          const lastAnalysis = analyses.length
            ? analyses.reduce((latest: any, a: any) => (a.created_at > latest.created_at ? a : latest), analyses[0])
            : null;
          return (
            <li key={m.id}>
              <Link
                href={`/mole/${m.id}`}
                className="panel flex items-center justify-between p-4 transition hover:border-[var(--color-primary)]/40"
              >
                <div>
                  <p className="font-medium">{m.label}</p>
                  {m.body_location && <p className="text-sm text-[var(--color-muted-foreground)]">{m.body_location}</p>}
                  <p className="text-xs text-[var(--color-muted-foreground)]">{analyses.length} скан(ов)</p>
                </div>
                <div className="flex items-center gap-2">
                  {lastAnalysis && (
                    <span className="text-xs text-[var(--color-muted-foreground)]">risk {Number(lastAnalysis.risk_score).toFixed(2)}</span>
                  )}
                  <span className="text-[var(--color-muted-foreground)]">→</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function StatCard({ label, value, decimals = 0 }: { label: string; value: number | null; decimals?: number }) {
  return (
    <div className="panel p-3">
      <p className="text-xl font-semibold text-[var(--color-primary)]">
        {value !== null ? <NumberTicker value={value} decimalPlaces={decimals} /> : "—"}
      </p>
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
    </div>
  );
}

function EmptyStateIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeDasharray="2 3" />
      <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
