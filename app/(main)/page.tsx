import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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
          className="flex min-h-11 items-center rounded-lg bg-[var(--color-accent)] px-5 text-sm font-medium text-white active:scale-95"
        >
          + Добавить
        </Link>
      </header>

      {!!moles?.length && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <StatCard label="Родинок отслеживается" value={moles.length} />
          <StatCard label="Всего сканов" value={totalScans} />
          <StatCard label="Средний risk score" value={avgRisk !== null ? avgRisk.toFixed(2) : "—"} />
          <StatCard label="Макс. risk score" value={maxRisk !== null ? maxRisk.toFixed(2) : "—"} />
        </div>
      )}

      {!moles?.length && (
        <div className="mt-16 text-center">
          <p className="text-sm font-medium text-slate-600">Пока нет родинок</p>
          <p className="text-sm text-slate-400">Добавьте первую, чтобы начать отслеживание.</p>
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
                className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium">{m.label}</p>
                  {m.body_location && <p className="text-sm text-slate-500">{m.body_location}</p>}
                  <p className="text-xs text-slate-400">{analyses.length} скан(ов)</p>
                </div>
                <div className="flex items-center gap-2">
                  {lastAnalysis && (
                    <span className="text-xs text-slate-400">risk {Number(lastAnalysis.risk_score).toFixed(2)}</span>
                  )}
                  <span className="text-slate-400">→</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-sm">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
