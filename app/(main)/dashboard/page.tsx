import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RiskGauge, riskLevel } from "@/components/risk-gauge";

const RISK_THRESHOLD = 0.3;

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  const isDoctor =
    (user.app_metadata as Record<string, unknown> | undefined)?.doctor === true;
  if (!isDoctor) redirect("/");

  const { data: cases } = await db
    .from("photo_analyses")
    .select("id, mole_id, risk_score, created_at, moles(label, body_location, owner_id)")
    .gte("risk_score", RISK_THRESHOLD)
    .order("risk_score", { ascending: false });

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
      {/* Header */}
      <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </span>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">
              Клинический регистр: случаи требующие внимания
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Случаи с индексом риска ≥ {Math.round(RISK_THRESHOLD * 100)}% · Всего записей: {cases?.length ?? 0}
          </p>
        </div>

        <Link href="/" className="btn-ghost text-xs self-start sm:self-auto">
          ← В личный кабинет
        </Link>
      </header>

      {/* Empty state */}
      {!cases?.length ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-800/40 bg-emerald-950/20 text-emerald-400">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">
              Нет критических случаев
            </p>
            <p className="mt-1 text-xs text-slate-400">
              В текущей выборке отсутствуют сканы с риском выше {Math.round(RISK_THRESHOLD * 100)}%.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="space-y-2.5 md:hidden">
            {cases.map((c: any) => {
              const { label, level } = riskLevel(c.risk_score);
              const risk = Number(c.risk_score);

              return (
                <li key={c.id}>
                  <Link
                    href={`/mole/${c.mole_id}`}
                    className="panel panel-interactive flex items-center justify-between gap-3 p-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-100">
                          {c.moles?.label ?? c.mole_id}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            level === "high"
                              ? "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                              : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                          }`}
                        >
                          {label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {c.moles?.body_location || "Локализация не указана"}
                      </p>
                      <span className="mt-1 block text-[11px] text-slate-500">
                        {new Date(c.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-slate-100">
                          {Math.round(risk * 100)}%
                        </span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Desktop: table */}
          <div className="panel hidden overflow-hidden md:block">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Родинка</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Локализация</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Индекс риска</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider">Дата анализа</th>
                  <th className="px-4 py-3 text-right font-semibold uppercase tracking-wider">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {cases.map((c: any) => {
                  const risk = Number(c.risk_score);
                  const { label, level } = riskLevel(c.risk_score);

                  return (
                    <tr key={c.id} className="transition hover:bg-slate-800/30">
                      <td className="px-4 py-3.5 font-medium text-slate-200">
                        <Link
                          href={`/mole/${c.mole_id}`}
                          className="font-semibold text-sky-400 hover:underline"
                        >
                          {c.moles?.label ?? c.mole_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {c.moles?.body_location ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-200">
                            {Math.round(risk * 100)}%
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              level === "high"
                                ? "bg-rose-950/80 text-rose-300 border border-rose-800/60"
                                : "bg-amber-950/80 text-amber-300 border border-amber-800/60"
                            }`}
                          >
                            {label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {new Date(c.created_at).toLocaleDateString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/mole/${c.mole_id}`}
                          className="btn-ghost py-1 px-2.5 text-[11px]"
                        >
                          Открыть карту
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
